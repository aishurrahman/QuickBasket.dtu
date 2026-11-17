import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  description: z.string().optional(),
  discountType: z.enum(["flat", "percent"]).optional(),
  discountValue: z.number().positive().optional(),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().positive().nullable().optional(),
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
  if (data.discountValue !== undefined) updates.discountValue = data.discountValue.toFixed(2);
  if (data.minOrderValue !== undefined) updates.minOrderValue = data.minOrderValue.toFixed(2);
  if (data.maxDiscount !== undefined) updates.maxDiscount = data.maxDiscount ? data.maxDiscount.toFixed(2) : null;

  const [row] = await db
    .update(coupons)
    .set(updates)
    .where(eq(coupons.id, Number(id)))
    .returning();

  if (!row) return jsonError("Coupon not found", 404);
  return jsonOk({ coupon: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await db.delete(coupons).where(eq(coupons.id, Number(id)));
  return jsonOk({ success: true });
}
