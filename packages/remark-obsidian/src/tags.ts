import type { InlineTagMatch } from "./types.js";

const TAG_PREFIX_BOUNDARY = /[\s([{>]/;
const TRAILING_TAG_PUNCTUATION = /[.,;:!?)}\]"']+$/;
const INLINE_TAG_STOP_CHARS = new Set([
  "<",
  ">",
  '"',
  "'",
  "`",
  "\\",
  "#",
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
]);

export function getTags(
  frontmatter: Record<string, unknown>,
  markdown = "",
  options: { inline?: boolean } = {},
): string[] {
  return unique([
    ...getFrontmatterTags(frontmatter),
    ...((options.inline ?? true) ? extractInlineTags(markdown) : []),
  ]);
}

export function getFrontmatterTags(
  frontmatter: Record<string, unknown>,
): string[] {
  const value = frontmatter.tags ?? frontmatter.tag;
  if (Array.isArray(value)) {
    return value.map(String).map(normalizeTag).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map(normalizeTag)
      .filter(Boolean);
  }
  return [];
}

export function extractInlineTags(markdown: string): string[] {
  return unique(collectInlineTagMatches(markdown).map((match) => match.tag));
}

export function collectInlineTagMatches(markdown: string): InlineTagMatch[] {
  const ignoredRanges = getIgnoredRanges(markdown);
  const matches: InlineTagMatch[] = [];

  for (let index = 0; index < markdown.length; index += 1) {
    if (markdown[index] !== "#") continue;
    if (!hasTagBoundary(markdown, index)) continue;
    if (isIgnoredIndex(index, ignoredRanges)) continue;

    const inlineTag = readInlineTag(markdown, index);
    if (!inlineTag) continue;
    matches.push(inlineTag);
    index = inlineTag.end - 1;
  }

  return matches;
}

export function normalizeTag(tag: string): string {
  const normalized = tag.trim().replace(/^#/, "").toLowerCase();
  if (!isValidTag(normalized)) return "";
  return normalized;
}

export function tagMatches(candidate: string, query: string): boolean {
  const tag = normalizeTag(candidate);
  const normalizedQuery = normalizeTag(query);
  if (!tag || !normalizedQuery) return false;
  return tag === normalizedQuery || tag.startsWith(`${normalizedQuery}/`);
}

export function getTagHierarchy(tag: string): string[] {
  const normalized = normalizeTag(tag);
  if (!normalized) return [];

  const segments = normalized.split("/");
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

export function readInlineTag(
  markdown: string,
  hashIndex: number,
): InlineTagMatch | undefined {
  let end = hashIndex + 1;

  while (end < markdown.length && isInlineTagChar(markdown[end]!)) {
    end += 1;
  }

  let raw = markdown.slice(hashIndex, end);
  raw = raw.replace(TRAILING_TAG_PUNCTUATION, "");
  const tag = normalizeTag(raw);
  if (!tag) return undefined;

  return {
    tag,
    raw,
    start: hashIndex,
    end: hashIndex + raw.length,
  };
}

export function hasTagBoundary(markdown: string, hashIndex: number): boolean {
  return (
    hashIndex === 0 || TAG_PREFIX_BOUNDARY.test(markdown[hashIndex - 1] ?? "")
  );
}

function isInlineTagChar(char: string): boolean {
  return !/\s/u.test(char) && !INLINE_TAG_STOP_CHARS.has(char);
}

function isValidTag(tag: string): boolean {
  return (
    tag.length > 0 &&
    !/\s/u.test(tag) &&
    !tag.startsWith("/") &&
    !tag.endsWith("/") &&
    !tag.includes("//") &&
    !tag.includes("#") &&
    /[^\d/]/u.test(tag)
  );
}

function getIgnoredRanges(markdown: string): Array<[number, number]> {
  return [
    ...matchRanges(
      markdown,
      /(^|\n)(```|~~~)[^\n]*(?:\n[\s\S]*?\n\2(?=\n|$)|[\s\S]*$)/g,
    ),
    ...matchRanges(markdown, /`+[^`\n]*`+/g),
    ...matchRanges(markdown, /%%[\s\S]*?%%/g),
    ...matchRanges(markdown, /!?\[[^\]\n]*]\([^)]+\)/g),
    ...matchRanges(markdown, /https?:\/\/[^\s)]+/g),
  ].sort((left, right) => left[0] - right[0]);
}

function matchRanges(
  markdown: string,
  pattern: RegExp,
): Array<[number, number]> {
  return [...markdown.matchAll(pattern)].map((match) => [
    match.index,
    match.index + match[0].length,
  ]);
}

function isIgnoredIndex(
  index: number,
  ranges: Array<[number, number]>,
): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
