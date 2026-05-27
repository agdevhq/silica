import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const secret = process.env.SILICA_REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-silica-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag");
  if (!tag) return NextResponse.json({ error: "Missing tag" }, { status: 400 });
  revalidateTag(tag, "max");
  return NextResponse.json({ ok: true, tag });
}
