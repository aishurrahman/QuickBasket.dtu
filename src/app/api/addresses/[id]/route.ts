import { NextRequest } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await db.delete(addresses).where(and(eq(addresses.id, Number(id)), eq(addresses.userId, session.userId)));
  return jsonOk({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, session.userId));
  }

  const [row] = await db
    .update(addresses)
    .set(body)
    .where(and(eq(addresses.id, Number(id)), eq(addresses.userId, session.userId)))
    .returning();

  if (!row) return jsonError("Address not found", 404);
  return jsonOk({ address: row });
}
