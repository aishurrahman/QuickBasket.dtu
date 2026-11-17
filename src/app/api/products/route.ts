import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { jsonError, jsonOk, slugify } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";
import { demoCategories, demoProducts } from "@/lib/demo-catalog";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const categorySlug = searchParams.get("category")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const conditions = [];
  if (!includeInactive) conditions.push(eq(products.isActive, true));
  if (q) {
    conditions.push(or(ilike(products.name, `%${q}%`), ilike(products.description, `%${q}%`)));
  }

  let rows;
  try {
    let categoryId: number | undefined;
    if (categorySlug) {
      const [cat] = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (cat) categoryId = cat.id;
      else return jsonOk({ products: [] });
    }
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));

    rows = await db
      .select()
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(includeInactive ? desc(products.createdAt) : asc(products.name))
      .limit(limit);
  } catch {
    const categoryId = categorySlug
      ? demoCategories.find((category) => category.slug === categorySlug)?.id
      : undefined;
    rows = demoProducts
      .filter((product) => (includeInactive || product.isActive))
      .filter((product) => !q || `${product.name} ${product.description}`.toLowerCase().includes(q.toLowerCase()))
      .filter((product) => !categorySlug || product.categoryId === categoryId)
      .slice(0, limit);
  }

  return jsonOk({ products: rows });
}

const schema = z.object({
  categoryId: z.number().int(),
  name: z.string().min(2),
  description: z.string().optional(),
  imageEmoji: z.string().max(10).default("🛍️"),
  unit: z.string().min(1),
  mrp: z.number().positive(),
  price: z.number().positive(),
  stock: z.number().int().min(0).default(100),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const data = parsed.data;
  if (data.price > data.mrp) return jsonError("Price cannot exceed MRP", 422);

  const [row] = await db
    .insert(products)
    .values({
      categoryId: data.categoryId,
      name: data.name,
      slug: slugify(data.name) + "-" + Date.now().toString(36),
      description: data.description ?? "",
      imageEmoji: data.imageEmoji,
      unit: data.unit,
      mrp: data.mrp.toFixed(2),
      price: data.price.toFixed(2),
      stock: data.stock,
      isActive: data.isActive,
    })
    .returning();

  return jsonOk({ product: row }, 201);
}
