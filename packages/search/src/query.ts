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
  const limit = options.limit ?? 10;
  const tagFilter = (options.tags ?? []).map(normalizeTag).filter(Boolean);
  if (!normalized && tagFilter.length === 0) return [];

  if (!normalized) {
    return [...loaded.recordsById.values()]
      .filter((record) => matchesTagFilter(record, tagFilter))
      .map((record) => toResult(record, 1))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, limit);
  }

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
      if (!matchesTagFilter(record, tagFilter)) return undefined;
      return toResult(record, score);
    })
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function tagMatches(candidate: string, query: string): boolean {
  const tag = normalizeTag(candidate);
  const normalizedQuery = normalizeTag(query);
  if (!tag || !normalizedQuery) return false;
  return tag === normalizedQuery || tag.startsWith(`${normalizedQuery}/`);
}

function matchesTagFilter(
  record: StoredSearchRecord,
  tagFilter: string[],
): boolean {
  return (
    tagFilter.length === 0 ||
    record.tags.some((tag) =>
      tagFilter.some((filterTag) => tagMatches(tag, filterTag)),
    )
  );
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
