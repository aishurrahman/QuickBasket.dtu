import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const rows = await db.select().from(addresses).where(eq(addresses.userId, session.userId)).orderBy(desc(addresses.isDefault));
  return jsonOk({ addresses: rows });
}

const schema = z.object({
  label: z.string().min(1).default("Home"),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4).max(10),
  phone: z.string().min(10),
  isDefault: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const data = parsed.data;

  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, session.userId));
  }

  const [row] = await db
    .insert(addresses)
    .values({ ...data, userId: session.userId })
    .returning();

  return jsonOk({ address: row }, 201);
}
