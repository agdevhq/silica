import path from "node:path";
import { NextResponse } from "next/server";
import { loadSearchIndex, querySearchIndex } from "@silicajs/search";
import { getSilicaRoot } from "../server-data.js";

const MAX_QUERY_LENGTH = 120;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 64;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query is too long" }, { status: 400 });
  }

  const parsed = parseTagQuery(query);
  const tags = [...url.searchParams.getAll("tag"), ...parsed.tags]
    .slice(0, MAX_TAGS)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH);
  const loaded = await loadSearchIndex(
    path.join(getSilicaRoot(), "search-index.json"),
  );
  const results = querySearchIndex(loaded, parsed.query, { tags, limit: 10 });
  return NextResponse.json({
    results: results.map(({ slug, title, excerpt }) => ({
      slug,
      title,
      excerpt,
    })),
  });
}

export function parseTagQuery(query: string): {
  query: string;
  tags: string[];
} {
  const tags: string[] = [];
  const withoutOperators = query.replace(
    /(?:^|\s)tag:(#?\S+)/gi,
    (_match, tag: string) => {
      tags.push(tag);
      return " ";
    },
  );
  const withoutShortcuts = withoutOperators.replace(
    /(?:^|\s)(#\S+)/g,
    (_match, tag: string) => {
      tags.push(tag);
      return " ";
    },
  );

  return {
    query: withoutShortcuts.replace(/\s+/g, " ").trim(),
    tags,
  };
}
