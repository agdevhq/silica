import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag");
  if (!tag) return NextResponse.json({ error: "Missing tag" }, { status: 400 });
  revalidateTag(tag, "max");
  return NextResponse.json({ ok: true, tag });
}
