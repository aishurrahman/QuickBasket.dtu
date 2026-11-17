import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pincodes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const check = searchParams.get("check");
  if (check) {
    const [row] = await db.select().from(pincodes).where(eq(pincodes.pincode, check)).limit(1);
    return jsonOk({
      deliverable: row ? row.deliverable : false,
      known: Boolean(row),
      area: row?.area ?? null,
    });
  }
  const rows = await db.select().from(pincodes).orderBy(asc(pincodes.pincode));
  return jsonOk({ pincodes: rows });
}

const schema = z.object({
  pincode: z.string().min(4).max(10),
  area: z.string().min(2),
  deliverable: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const [row] = await db.insert(pincodes).values(parsed.data).returning();
  return jsonOk({ pincode: row }, 201);
}
