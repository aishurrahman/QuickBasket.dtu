import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { requireAdmin, getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  if (session?.role === "admin") return jsonOk({ coupons: rows });
  return jsonOk({ coupons: rows.filter((c) => c.isActive) });
}

const schema = z.object({
  code: z.string().min(3).max(40),
  description: z.string().optional(),
  discountType: z.enum(["flat", "percent"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  maxDiscount: z.number().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  const data = parsed.data;

  const existing = await db.select().from(coupons).where(eq(coupons.code, data.code.toUpperCase())).limit(1);
  if (existing.length) return jsonError("Coupon code already exists", 409);

  const [row] = await db
    .insert(coupons)
    .values({
      code: data.code.toUpperCase(),
      description: data.description ?? "",
      discountType: data.discountType,
      discountValue: data.discountValue.toFixed(2),
      minOrderValue: data.minOrderValue.toFixed(2),
      maxDiscount: data.maxDiscount ? data.maxDiscount.toFixed(2) : null,
      isActive: data.isActive,
    })
    .returning();

  return jsonOk({ coupon: row }, 201);
}
