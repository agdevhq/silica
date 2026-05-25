import path from "node:path";
import { NextResponse } from "next/server";
import { loadSearchIndex, querySearchIndex } from "@silicajs/search";
import { getSilicaRoot } from "../server-data.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const tags = url.searchParams.getAll("tag");
  const started = performance.now();
  const loaded = await loadSearchIndex(path.join(getSilicaRoot(), "search-index.json"));
  const results = querySearchIndex(loaded, query, { tags, limit: 10 });
  return NextResponse.json({
    results,
    timingMs: Math.round((performance.now() - started) * 100) / 100,
  });
}
