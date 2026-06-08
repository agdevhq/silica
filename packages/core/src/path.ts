import path from "node:path";

declare const filePathBrand: unique symbol;
declare const fullSlugBrand: unique symbol;
declare const simpleSlugBrand: unique symbol;
declare const relativeUrlBrand: unique symbol;

export type FilePath = string & { readonly [filePathBrand]: "FilePath" };
export type FullSlug = string & { readonly [fullSlugBrand]: "FullSlug" };
export type SimpleSlug = string & { readonly [simpleSlugBrand]: "SimpleSlug" };
export type RelativeURL = string & {
  readonly [relativeUrlBrand]: "RelativeURL";
};

export type SlugifyOptions = {
  numericPrefixes?: boolean;
};

const NUMERIC_PREFIX_RE = /^(\d+)[\s._-]+(.+)$/;
const DOCUMENT_EXTENSION_RE = /\.(md|markdown|mdx)$/i;
const UNORDERED_SEGMENT_SORT_PREFIX = "~~~~~~~~~~";

export function asFilePath(value: string): FilePath {
  return normalizePath(value) as FilePath;
}

export function asFullSlug(value: string): FullSlug {
  return normalizeSlug(value) as FullSlug;
}

export function asSimpleSlug(value: string): SimpleSlug {
  return simplifySlug(asFullSlug(value)) as SimpleSlug;
}

export function asRelativeURL(value: string): RelativeURL {
  return value as RelativeURL;
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function stripNumericPrefix(segment: string): string {
  return segment.replace(NUMERIC_PREFIX_RE, "$2");
}

export function hasNumericPrefix(segment: string): boolean {
  return NUMERIC_PREFIX_RE.test(segment);
}

export function slugifySegment(
  segment: string,
  options: SlugifyOptions = {},
): string {
  const displaySegment = options.numericPrefixes
    ? stripNumericPrefix(segment)
    : segment;
  return displaySegment
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSlug(
  value: string,
  options: SlugifyOptions = {},
): string {
  const cleaned = normalizePath(value)
    .replace(/^\.\//, "")
    .replace(DOCUMENT_EXTENSION_RE, "");
  const parts = cleaned
    .split("/")
    .filter(Boolean)
    .map((part) => slugifySegment(part, options));
  return (parts.join("/") || "index").replace(/\/index\/index$/, "/index");
}

export function slugifyFilePath(
  filePath: FilePath | string,
  contentDir = "content",
  options: SlugifyOptions = {},
): FullSlug {
  const normalizedFile = normalizePath(filePath);
  const normalizedContent = normalizePath(contentDir);
  const relative = normalizedFile.startsWith(`${normalizedContent}/`)
    ? normalizedFile.slice(normalizedContent.length + 1)
    : normalizedFile;

  return asFullSlug(normalizeSlug(relative, options));
}

export function hasNumericPrefixInPath(filePath: string): boolean {
  return normalizePath(filePath)
    .replace(DOCUMENT_EXTENSION_RE, "")
    .split("/")
    .some((segment) => hasNumericPrefix(segment));
}

export function numericPrefixSortKey(filePath: string): string {
  return normalizePath(filePath)
    .replace(DOCUMENT_EXTENSION_RE, "")
    .split("/")
    .filter(Boolean)
    .map(numericPrefixSortSegment)
    .join("/");
}

export function simplifySlug(slug: FullSlug | string): SimpleSlug {
  const normalized = normalizeSlug(slug);
  if (normalized === "index") return "" as SimpleSlug;
  return normalized.replace(/\/index$/, "") as SimpleSlug;
}

export function slugToHref(slug: FullSlug | string): string {
  const simple = simplifySlug(slug).toString();
  return simple ? `/${simple}` : "/";
}

export function hrefToSlug(href: string): FullSlug {
  const normalized = normalizePath(href.split("#")[0] ?? "");
  return asFullSlug(normalized === "" ? "index" : normalized);
}

export function pathToRoot(slug: FullSlug | string): RelativeURL {
  const simple = simplifySlug(slug).toString();
  const depth = simple ? simple.split("/").length - 1 : 0;
  return asRelativeURL(depth === 0 ? "." : Array(depth).fill("..").join("/"));
}

export function resolveRelative(
  currentSlug: FullSlug | string,
  target: string,
  options: SlugifyOptions = {},
): FullSlug {
  const currentDir = normalizePath(currentSlug)
    .split("/")
    .slice(0, -1)
    .join("/");
  return asFullSlug(
    normalizeSlug(path.posix.join(currentDir, target), options),
  );
}

export function resolveWikiLink(
  currentSlug: FullSlug | string,
  target: string,
  allSlugs: readonly string[],
  strategy: "absolute" | "relative" | "shortest" = "shortest",
  options: SlugifyOptions = {},
): FullSlug | undefined {
  const [rawPath] = target.split("#");
  const normalizedTarget = normalizeSlug(rawPath ?? target, options);
  const candidates = new Set(allSlugs.map((slug) => normalizeSlug(slug)));

  if (strategy === "absolute" && candidates.has(normalizedTarget))
    return asFullSlug(normalizedTarget);

  if (strategy === "relative") {
    const relative = resolveRelative(currentSlug, normalizedTarget, options);
    if (candidates.has(relative)) return relative;
  }

  if (candidates.has(normalizedTarget)) return asFullSlug(normalizedTarget);
  if (candidates.has(`${normalizedTarget}/index`))
    return asFullSlug(`${normalizedTarget}/index`);

  const byBasename = [...candidates].filter((slug) => {
    const simplified = simplifySlug(slug).toString();
    return simplified.split("/").at(-1) === normalizedTarget.split("/").at(-1);
  });

  return byBasename.length === 1 ? asFullSlug(byBasename[0]!) : undefined;
}

export function joinSegments(...segments: string[]): string {
  return normalizePath(segments.filter(Boolean).join("/"));
}

function numericPrefixSortSegment(segment: string): string {
  const match = NUMERIC_PREFIX_RE.exec(segment);
  if (!match) {
    return `${UNORDERED_SEGMENT_SORT_PREFIX}:${slugifySegment(segment)}`;
  }

  const order = match[1]!.padStart(10, "0");
  return `${order}:${slugifySegment(match[2]!)}`;
}
