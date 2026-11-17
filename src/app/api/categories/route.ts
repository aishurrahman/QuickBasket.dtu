import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { jsonError, jsonOk, slugify } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";
import { demoCategories } from "@/lib/demo-catalog";

export async function GET() {
  let rows;
  try {
    rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  } catch {
    rows = demoCategories;
  }
  return jsonOk({ categories: rows });
}

const schema = z.object({
  name: z.string().min(2),
  emoji: z.string().min(1).max(10).default("🛒"),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const { name, emoji, sortOrder } = parsed.data;
  const [row] = await db.insert(categories).values({ name, emoji, sortOrder, slug: slugify(name) }).returning();
  return jsonOk({ category: row }, 201);
}
