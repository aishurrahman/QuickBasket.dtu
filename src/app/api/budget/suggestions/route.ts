import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";

const schema = z.object({ items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) })).min(1).max(30) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid basket", 422);
  const ids = parsed.data.items.map((item) => item.productId);
  const sourceRows = await db.select().from(products).where(inArray(products.id, ids));
  if (sourceRows.length !== new Set(ids).size) return jsonError("A basket product is unavailable", 409);

  const result = [];
  for (const item of parsed.data.items) {
    const source = sourceRows.find((row) => row.id === item.productId)!;
    const alternatives = await db.select().from(products)
      .where(eq(products.categoryId, source.categoryId))
      .orderBy(asc(products.price))
      .limit(12);
    result.push({
      sourceProductId: source.id,
      sourceName: source.name,
      quantity: item.quantity,
      alternatives: alternatives.filter((p) => p.id !== source.id && p.isActive && p.stock >= item.quantity && Number(p.price) < Number(source.price))
        .slice(0, 3)
        .map((p) => ({
          productId: p.id, name: p.name, unit: p.unit, imageEmoji: p.imageEmoji, price: Number(p.price), mrp: Number(p.mrp), stock: p.stock,
          saving: Math.round((Number(source.price) - Number(p.price)) * item.quantity * 100) / 100,
        })),
    });
  }
  return jsonOk({ alternatives: result });
}
