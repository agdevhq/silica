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

export type WikiLinkResolutionIndex = {
  candidates: ReadonlySet<string>;
  uniqueSlugByBasename: ReadonlyMap<string, string | null>;
};

export type AssetResolutionIndex = {
  assetPathBySourcePath: ReadonlyMap<string, string | null>;
  assetPathByBasename: ReadonlyMap<string, string | null>;
};

export type AssetResolutionEntry = {
  sourcePath: string;
  assetPath: string;
};

const NUMERIC_PREFIX_RE =
  /^(\d{1,2}|0\d+|\d{3,}(?=[._]))(?:[\s._]+|-(?!\d{1,2}(?:\D|$)))(.+)$/;
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

export function normalizeAssetReference(
  value: string,
  options: SlugifyOptions = {},
): string {
  const cleaned = normalizePath(stripAssetReferenceSuffix(value)).replace(
    /^\.\//,
    "",
  );
  const parts = cleaned
    .split("/")
    .filter(Boolean)
    .map((part) => normalizeAssetSegment(part, options))
    .filter(Boolean);
  return parts.join("/");
}

export function slugifyAssetPath(
  sourcePath: string,
  options: SlugifyOptions = {},
): string {
  return normalizeAssetReference(sourcePath, options);
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

export function createWikiLinkResolutionIndex(
  allSlugs: readonly string[],
  options: SlugifyOptions = {},
): WikiLinkResolutionIndex {
  const candidates = new Set(
    allSlugs.map((slug) =>
      normalizeSlug(slug, { ...options, numericPrefixes: false }),
    ),
  );
  const uniqueSlugByBasename = new Map<string, string | null>();

  for (const slug of candidates) {
    const basename = basenameForNormalizedSlug(slug);
    if (!basename) continue;
    if (uniqueSlugByBasename.has(basename)) {
      uniqueSlugByBasename.set(basename, null);
      continue;
    }
    uniqueSlugByBasename.set(basename, slug);
  }

  return { candidates, uniqueSlugByBasename };
}

export function createAssetResolutionIndex(
  assets: readonly AssetResolutionEntry[],
  options: SlugifyOptions = {},
): AssetResolutionIndex {
  const assetPathBySourcePath = new Map<string, string | null>();
  const assetPathByBasename = new Map<string, string | null>();

  for (const asset of assets) {
    const sourcePath = normalizePath(asset.sourcePath);
    const assetPath = normalizePath(asset.assetPath);
    addUniqueCandidate(
      assetPathBySourcePath,
      normalizeAssetReference(sourcePath, options),
      assetPath,
    );
    addUniqueCandidate(
      assetPathByBasename,
      normalizeAssetReference(path.posix.basename(sourcePath), options),
      assetPath,
    );
  }

  return { assetPathBySourcePath, assetPathByBasename };
}

export function resolveWikiLink(
  currentSlug: FullSlug | string,
  target: string,
  index: WikiLinkResolutionIndex,
  strategy: "absolute" | "relative" | "shortest" = "shortest",
  options: SlugifyOptions = {},
): FullSlug | undefined {
  const [rawPath] = target.split("#");
  const normalizedTarget = normalizeSlug(rawPath ?? target, options);
  const { candidates } = index;

  if (strategy === "absolute" && candidates.has(normalizedTarget))
    return asFullSlug(normalizedTarget);

  if (strategy === "relative") {
    const relative = resolveRelative(currentSlug, normalizedTarget, options);
    if (candidates.has(relative)) return relative;
  }

  if (candidates.has(normalizedTarget)) return asFullSlug(normalizedTarget);
  if (candidates.has(`${normalizedTarget}/index`))
    return asFullSlug(`${normalizedTarget}/index`);

  const targetBasename = normalizedTarget.split("/").at(-1) ?? "";
  const byBasename = index.uniqueSlugByBasename.get(targetBasename);

  return byBasename ? asFullSlug(byBasename) : undefined;
}

export function resolveAssetPath(
  currentSourcePath: string,
  target: string,
  index: AssetResolutionIndex,
  strategy: "absolute" | "relative" | "shortest" = "shortest",
  options: SlugifyOptions = {},
): string | undefined {
  if (/^(?:https?:|#|\/)/.test(target)) return undefined;
  const normalizedTarget = normalizeAssetReference(target, options);
  if (!normalizedTarget) return undefined;

  if (strategy === "absolute") {
    return uniqueValue(index.assetPathBySourcePath, normalizedTarget);
  }

  if (strategy === "relative") {
    const relative = resolveRelativeAsset(currentSourcePath, target, options);
    const resolved = uniqueValue(index.assetPathBySourcePath, relative);
    if (resolved) return resolved;
  }

  return (
    uniqueValue(index.assetPathBySourcePath, normalizedTarget) ??
    uniqueValue(
      index.assetPathByBasename,
      normalizedTarget.split("/").at(-1) ?? "",
    )
  );
}

export function resolveRelativeAsset(
  currentSourcePath: string,
  target: string,
  options: SlugifyOptions = {},
): string {
  const currentDir = normalizePath(currentSourcePath)
    .split("/")
    .slice(0, -1)
    .join("/");
  return normalizeAssetReference(
    path.posix.join(currentDir, stripAssetReferenceSuffix(target)),
    options,
  );
}

export function joinSegments(...segments: string[]): string {
  return normalizePath(segments.filter(Boolean).join("/"));
}

function basenameForNormalizedSlug(slug: string): string {
  const simplified = slug === "index" ? "" : slug.replace(/\/index$/, "");
  return simplified.split("/").at(-1) ?? "";
}

function normalizeAssetSegment(
  segment: string,
  options: SlugifyOptions = {},
): string {
  const extension = path.posix.extname(segment);
  if (!extension) return slugifySegment(segment, options);
  const stem = segment.slice(0, -extension.length);
  const normalizedStem = slugifySegment(stem, options);
  return normalizedStem ? `${normalizedStem}${extension.toLowerCase()}` : "";
}

function stripAssetReferenceSuffix(value: string): string {
  const suffixIndexes = [value.indexOf("?"), value.indexOf("#")].filter(
    (index) => index >= 0,
  );
  const suffixIndex = Math.min(...suffixIndexes);
  return Number.isFinite(suffixIndex) ? value.slice(0, suffixIndex) : value;
}

function addUniqueCandidate(
  candidates: Map<string, string | null>,
  key: string,
  value: string,
) {
  if (!key) return;
  const existing = candidates.get(key);
  if (existing === undefined) {
    candidates.set(key, value);
    return;
  }
  if (existing !== value) {
    candidates.set(key, null);
  }
}

function uniqueValue(
  candidates: ReadonlyMap<string, string | null>,
  key: string,
): string | undefined {
  return candidates.get(key) ?? undefined;
}

function numericPrefixSortSegment(segment: string): string {
  const match = NUMERIC_PREFIX_RE.exec(segment);
  if (!match) {
    return `${UNORDERED_SEGMENT_SORT_PREFIX}:${slugifySegment(segment)}`;
  }

  const order = match[1]!.padStart(10, "0");
  return `${order}:${slugifySegment(match[2]!)}`;
}
