import { NextResponse } from "next/server";
import { querySearchIndex } from "@silicajs/search";
import { loadSearchIndex } from "../server-data.js";
import {
  logSilicaTiming,
  timeSilica,
  withSilicaTimingTrace,
} from "../server-timing.js";

const MAX_QUERY_LENGTH = 120;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 64;

export async function GET(request: Request) {
  return withSilicaTimingTrace("api.search.request", {}, () => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    if (query.length > MAX_QUERY_LENGTH) {
      logSilicaTiming("api.search.rejected", {
        reason: "query-too-long",
        queryLength: query.length,
      });
      return NextResponse.json({ error: "Query is too long" }, { status: 400 });
    }

    const parsed = timeSilica("api.search.parse-query", {}, () =>
      parseTagQuery(query),
    );
    const tags = timeSilica("api.search.parse-tags", {}, () =>
      [...url.searchParams.getAll("tag"), ...parsed.tags]
        .slice(0, MAX_TAGS)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH),
    );
    const loaded = loadSearchIndex();
    const results = timeSilica(
      "api.search.query-index",
      { queryLength: parsed.query.length, tagCount: tags.length },
      () => querySearchIndex(loaded, parsed.query, { tags, limit: 10 }),
    );
    logSilicaTiming("api.search.response", {
      queryLength: parsed.query.length,
      tagCount: tags.length,
      resultCount: results.length,
    });
    return NextResponse.json({
      results: results.map(({ slug, title, titleParts, excerptParts }) => ({
        slug,
        title,
        titleParts,
        excerptParts,
      })),
    });
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
