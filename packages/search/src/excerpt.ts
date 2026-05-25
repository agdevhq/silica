const WORD_BOUNDARY = /\s+/g;

export function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function makeExcerpt(content: string, query: string, maxLength = 180): string {
  const normalized = normalizeSearchText(content);
  if (normalized.length <= maxLength) return normalized;

  const firstTerm = query
    .toLowerCase()
    .split(WORD_BOUNDARY)
    .find((term) => term.length > 1);

  const matchIndex = firstTerm ? normalized.toLowerCase().indexOf(firstTerm) : -1;
  const center = matchIndex >= 0 ? matchIndex : 0;
  const half = Math.floor(maxLength / 2);
  const start = Math.max(0, center - half);
  const end = Math.min(normalized.length, start + maxLength);
  const excerpt = normalized.slice(start, end).trim();

  return `${start > 0 ? "…" : ""}${excerpt}${end < normalized.length ? "…" : ""}`;
}
