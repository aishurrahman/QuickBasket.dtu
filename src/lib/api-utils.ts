import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400, details: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...details }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
