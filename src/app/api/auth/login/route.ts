import { NextRequest } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { getSupabaseAuthClient } from "@/lib/supabase-auth";
import { jsonError, jsonOk } from "@/lib/api-utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { email, password } = parsed.data;
  const supabase = getSupabaseAuthClient();
  if (!supabase) return jsonError("Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.", 503);
  if (!isDatabaseConfigured) return jsonError("Set DATABASE_URL to your Supabase PostgreSQL database and apply the app schema first.", 503);

  const normalizedEmail = email.toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  let authError = error;
  let providerUser = data.user;

  // Migrate an older QuickBasket account only after its stored password hash
  // proves control of that account. Never link an existing profile by email alone.
  if ((authError || !providerUser) && !authError?.message.toLowerCase().includes("email not confirmed")) {
    const [legacy] = await db.select().from(users).where(and(eq(users.email, normalizedEmail), isNull(users.supabaseAuthId))).limit(1);
    if (legacy?.passwordHash && await verifyPassword(password, legacy.passwordHash)) {
      const { data: migration, error: migrationError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name: legacy.name, phone: legacy.phone },
          emailRedirectTo: new URL("/login?confirmed=1", process.env.APP_URL ?? "http://localhost:3000").toString(),
        },
      });
      if (!migrationError && migration.user && migration.user.identities?.length !== 0) {
        const [linked] = await db.update(users).set({ supabaseAuthId: migration.user.id, passwordHash: null }).where(and(eq(users.id, legacy.id), isNull(users.supabaseAuthId))).returning();
        if (!linked) return jsonError("This account was updated concurrently. Please try logging in again.", 409);
        if (!migration.session) return jsonOk({ requiresEmailConfirmation: true });
        providerUser = migration.user;
        authError = null;
      }
    }
  }
  if (authError || !providerUser) return jsonError("Invalid email or password. If you just signed up, confirm your email first.", 401);

  let [user] = await db.select().from(users).where(eq(users.supabaseAuthId, providerUser.id)).limit(1);
  if (!user) {
    // Never attach by email to an existing profile: it might have elevated roles
    // or order history. Such legacy profiles need an explicit trusted migration.
    const [legacy] = await db.select({ id: users.id }).from(users).where(eq(users.email, providerUser.email ?? normalizedEmail)).limit(1);
    if (legacy) return jsonError("This existing QuickBasket profile must be linked by an administrator before it can use Supabase login.", 403);
    const metadata = providerUser.user_metadata ?? {};
    const name = typeof metadata.name === "string" && metadata.name.trim() ? metadata.name.trim() : (providerUser.email ?? email).split("@")[0];
    const phone = typeof metadata.phone === "string" ? metadata.phone : null;
    try {
      [user] = await db.insert(users).values({ name, email: (providerUser.email ?? email).toLowerCase(), phone, supabaseAuthId: providerUser.id, role: "customer" }).returning();
    } catch {
      return jsonError("Could not create your QuickBasket profile. Please try again.", 503);
    }
  }

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role, name: user.name });
  return jsonOk({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
