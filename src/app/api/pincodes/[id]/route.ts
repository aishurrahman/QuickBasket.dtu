import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pincodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  area: z.string().min(2).optional(),
  deliverable: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const [row] = await db
    .update(pincodes)
    .set(parsed.data)
    .where(eq(pincodes.id, Number(id)))
    .returning();

  if (!row) return jsonError("Pincode not found", 404);
  return jsonOk({ pincode: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await db.delete(pincodes).where(eq(pincodes.id, Number(id)));
  return jsonOk({ success: true });
}
