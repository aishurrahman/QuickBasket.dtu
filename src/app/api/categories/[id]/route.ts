import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk, slugify } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).optional(),
  emoji: z.string().min(1).max(10).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.name) updates.slug = slugify(parsed.data.name);

  const [row] = await db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, Number(id)))
    .returning();

  if (!row) return jsonError("Category not found", 404);
  return jsonOk({ category: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await db.delete(categories).where(eq(categories.id, Number(id)));
  return jsonOk({ success: true });
}
