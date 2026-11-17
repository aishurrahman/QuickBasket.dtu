import { NextRequest } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getSupabaseAuthClient } from "@/lib/supabase-auth";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Enter a valid phone number").optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { name, email, password, phone } = parsed.data;
  const supabase = getSupabaseAuthClient();
  if (!supabase) return jsonError("Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.", 503);
  if (!isDatabaseConfigured) return jsonError("Set DATABASE_URL to your Supabase PostgreSQL database and apply the app schema first.", 503);

  const normalizedEmail = email.toLowerCase();
  const [existingProfile] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existingProfile) {
    return jsonError(existingProfile.supabaseAuthId
      ? "An account with this email already exists. Log in instead."
      : "This is an existing QuickBasket account. Log in with its current password once to link it to Supabase.", 409);
  }
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name, phone: phone ?? null },
      emailRedirectTo: new URL("/login?confirmed=1", process.env.APP_URL ?? "http://localhost:3000").toString(),
    },
  });
  if (error) return jsonError(error.message, 422);
  if (!data.user) return jsonError("Supabase did not return a user account", 502);

  // Supabase may return an obfuscated user for an already registered email.
  // Avoid creating a QuickBasket profile for that placeholder identity.
  if (data.user.identities?.length === 0) {
    return jsonOk({ requiresEmailConfirmation: true }, 201);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) return jsonError("A QuickBasket profile already exists for this email. Contact support to link it safely.", 409);

  let [user] = await db.select().from(users).where(eq(users.supabaseAuthId, data.user.id)).limit(1);
  if (!user) {
    try {
      [user] = await db.insert(users).values({ name, email: normalizedEmail, phone, supabaseAuthId: data.user.id, role: "customer" }).returning();
    } catch {
      return jsonError("Your Supabase account was created, but QuickBasket could not save its profile. Try signing in again or contact support.", 503);
    }
  }

  if (!data.session) return jsonOk({ requiresEmailConfirmation: true }, 201);
  await setSessionCookie({ userId: user.id, email: user.email, role: user.role, name: user.name });
  return jsonOk({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, requiresEmailConfirmation: false }, 201);
}
