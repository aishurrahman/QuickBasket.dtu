import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNumeric = /^\d+$/.test(id);
  const [row] = await db
    .select()
    .from(products)
    .where(isNumeric ? eq(products.id, Number(id)) : eq(products.slug, id))
    .limit(1);
  if (!row) return jsonError("Product not found", 404);
  return jsonOk({ product: row });
}

const schema = z.object({
  categoryId: z.number().int().optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  imageEmoji: z.string().max(10).optional(),
  unit: z.string().min(1).optional(),
  mrp: z.number().positive().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const data = parsed.data;
  const updates: Record<string, unknown> = { ...data };
  if (data.mrp !== undefined) updates.mrp = data.mrp.toFixed(2);
  if (data.price !== undefined) updates.price = data.price.toFixed(2);

  const [row] = await db
    .update(products)
    .set(updates)
    .where(eq(products.id, Number(id)))
    .returning();

  if (!row) return jsonError("Product not found", 404);
  return jsonOk({ product: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await db.delete(products).where(eq(products.id, Number(id)));
  return jsonOk({ success: true });
}
