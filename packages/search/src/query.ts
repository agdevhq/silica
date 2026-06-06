import { normalizeSearchText } from "./excerpt.js";
import type { LoadedSearchIndex } from "./load.js";
import type {
  SearchHighlightPart,
  SearchQueryOptions,
  SearchResult,
} from "./types.js";

const HIGHLIGHT_START = "\uE000";
const HIGHLIGHT_END = "\uE001";

type SearchRow = {
  slug: string;
  title: string;
  highlighted_title: string | null;
  description: string | null;
  tags_json: string;
  highlighted_excerpt: string | null;
  score: number;
};

type TagOnlyRow = Omit<
  SearchRow,
  "highlighted_title" | "highlighted_excerpt" | "score"
> & {
  highlighted_title: null;
  excerpt: string;
  score: 0;
};

export function querySearchIndex(
  loaded: LoadedSearchIndex,
  query: string,
  options: SearchQueryOptions = {},
): SearchResult[] {
  const normalized = normalizeSearchText(query);
  const limit = options.limit ?? 10;
  const tagFilter = [
    ...new Set((options.tags ?? []).map(normalizeTag).filter(Boolean)),
  ];
  if (!normalized && tagFilter.length === 0) return [];

  if (!normalized) return queryByTags(loaded, tagFilter, limit);

  const ftsQuery = toFtsQuery(normalized);
  if (!ftsQuery) {
    return tagFilter.length > 0 ? queryByTags(loaded, tagFilter, limit) : [];
  }

  const tagClause = makeTagClause(tagFilter);
  const rows = loaded.db
    .prepare(
      `
      SELECT
        d.slug,
        d.title,
        highlight(search_index, 0, char(57344), char(57345)) AS highlighted_title,
        d.description,
        d.tags_json,
        snippet(search_index, -1, char(57344), char(57345), '…', 24) AS highlighted_excerpt,
        bm25(search_index, 8.0, 1.0, 3.0) AS score
      FROM search_index
      JOIN documents d ON d.rowid = search_index.rowid
      WHERE search_index MATCH ?
      ${tagClause.sql}
      ORDER BY score ASC, d.title COLLATE NOCASE ASC
      LIMIT ?
    `,
    )
    .all(ftsQuery, ...tagClause.params, limit) as SearchRow[];

  return rows.map(toResult);
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function queryByTags(
  loaded: LoadedSearchIndex,
  tags: string[],
  limit: number,
): SearchResult[] {
  const tagClause = makeTagClause(tags);
  if (!tagClause.sql) return [];

  const rows = loaded.db
    .prepare(
      `
      SELECT
        d.slug,
        d.title,
        NULL AS highlighted_title,
        d.description,
        d.tags_json,
        d.excerpt,
        0 AS score
      FROM documents d
      WHERE 1 = 1
      ${tagClause.sql}
      ORDER BY d.title COLLATE NOCASE ASC
      LIMIT ?
    `,
    )
    .all(...tagClause.params, limit) as TagOnlyRow[];

  return rows.map(toResult);
}

function makeTagClause(tags: string[]): { sql: string; params: string[] } {
  if (tags.length === 0) return { sql: "", params: [] };
  return {
    sql: `
      AND EXISTS (
        SELECT 1
        FROM document_tags dt
        WHERE dt.document_rowid = d.rowid
          AND dt.tag IN (${tags.map(() => "?").join(", ")})
      )
    `,
    params: tags,
  };
}

function toResult(row: SearchRow | TagOnlyRow): SearchResult {
  const excerpt =
    "highlighted_excerpt" in row
      ? (row.highlighted_excerpt ?? "")
      : row.excerpt;
  return {
    slug: row.slug,
    title: row.title,
    titleParts: toHighlightParts(row.highlighted_title ?? row.title),
    description: row.description ?? undefined,
    tags: parseTags(row.tags_json),
    excerptParts: toHighlightParts(excerpt),
    score: -row.score,
  };
}

function parseTags(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((tag): tag is string => typeof tag === "string")
    : [];
}

function toFtsQuery(query: string): string | undefined {
  const terms = query.match(/[\p{L}\p{N}_]+/gu) ?? [];
  const normalizedTerms = terms
    .map((term) => term.toLocaleLowerCase())
    .filter(Boolean);
  if (normalizedTerms.length === 0) return;

  return normalizedTerms
    .map((term) => (term.length >= 3 ? `${term}*` : term))
    .join(" ");
}

function toHighlightParts(value: string): SearchHighlightPart[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];

  const parts: SearchHighlightPart[] = [];
  let highlighted = false;
  for (const part of normalized.split(
    new RegExp(`(${HIGHLIGHT_START}|${HIGHLIGHT_END})`),
  )) {
    if (!part) continue;
    if (part === HIGHLIGHT_START) {
      highlighted = true;
      continue;
    }
    if (part === HIGHLIGHT_END) {
      highlighted = false;
      continue;
    }
    parts.push({ text: part, highlighted });
  }
  return parts;
}
