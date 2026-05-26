import { normalizeSearchText } from "./excerpt.js";
import type { LoadedSearchIndex } from "./load.js";
import type {
  SearchQueryOptions,
  SearchResult,
  StoredSearchRecord,
} from "./types.js";

type FlexDocumentResult = {
  field?: string;
  result: Array<string | number>;
};

export function querySearchIndex(
  loaded: LoadedSearchIndex,
  query: string,
  options: SearchQueryOptions = {},
): SearchResult[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const limit = options.limit ?? 10;
  const tagFilter = new Set(
    (options.tags ?? []).map((tag) => tag.toLowerCase()),
  );
  const rawResults = loaded.document.search(normalized, {
    limit: Math.max(limit * 4, 20),
    enrich: false,
  }) as FlexDocumentResult[];

  const scoreById = new Map<string, number>();
  for (const fieldResult of rawResults) {
    const fieldWeight =
      fieldResult.field === "title" ? 5 : fieldResult.field === "tags" ? 3 : 1;
    for (const id of fieldResult.result) {
      const key = String(id);
      scoreById.set(key, (scoreById.get(key) ?? 0) + fieldWeight);
    }
  }

  return [...scoreById.entries()]
    .map(([id, score]) => {
      const record = loaded.recordsById.get(id);
      if (!record) return undefined;
      if (
        tagFilter.size > 0 &&
        !record.tags.some((tag) => tagFilter.has(tag.toLowerCase()))
      ) {
        return undefined;
      }
      return toResult(record, score);
    })
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function toResult(record: StoredSearchRecord, score: number): SearchResult {
  return {
    slug: record.slug,
    title: record.title,
    description: record.description,
    tags: record.tags,
    excerpt: record.excerpt,
    score,
  };
}
