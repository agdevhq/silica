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
  slugsByBasename?: ReadonlyMap<string, readonly string[]>;
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
  const slugsByBasename = new Map<string, string[]>();

  for (const slug of candidates) {
    const basename = basenameForNormalizedSlug(slug);
    if (!basename) continue;
    const basenameCandidates = slugsByBasename.get(basename);
    if (basenameCandidates) {
      basenameCandidates.push(slug);
    } else {
      slugsByBasename.set(basename, [slug]);
    }
    if (uniqueSlugByBasename.has(basename)) {
      uniqueSlugByBasename.set(basename, null);
      continue;
    }
    uniqueSlugByBasename.set(basename, slug);
  }

  for (const basenameCandidates of slugsByBasename.values()) {
    basenameCandidates.sort(compareSlugs);
  }

  return { candidates, uniqueSlugByBasename, slugsByBasename };
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

  if (byBasename) return asFullSlug(byBasename);

  return closestWikiLinkCandidate(
    currentSlug,
    candidatesForBasename(index, targetBasename),
  );
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
  const isExplicitRelative = isExplicitRelativeAssetReference(target);

  if (isExplicitRelative || strategy === "relative") {
    const relative = resolveRelativeAsset(currentSourcePath, target, options);
    const resolved = uniqueValue(index.assetPathBySourcePath, relative);
    if (resolved || isExplicitRelative) return resolved;
  }

  if (strategy === "absolute") {
    return uniqueValue(index.assetPathBySourcePath, normalizedTarget);
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

function candidatesForBasename(
  index: WikiLinkResolutionIndex,
  basename: string,
): readonly string[] {
  const indexedCandidates = index.slugsByBasename?.get(basename);
  if (indexedCandidates) return indexedCandidates;

  return [...index.candidates]
    .filter((slug) => basenameForNormalizedSlug(slug) === basename)
    .sort(compareSlugs);
}

function closestWikiLinkCandidate(
  currentSlug: FullSlug | string,
  candidates: readonly string[],
): FullSlug | undefined {
  if (candidates.length === 0) return undefined;

  const currentDirectory = normalizeSlug(currentSlug, {
    numericPrefixes: false,
  })
    .split("/")
    .slice(0, -1);
  const [bestCandidate] = [...candidates].sort((left, right) => {
    const leftScore = wikiLinkCandidateScore(currentDirectory, left);
    const rightScore = wikiLinkCandidateScore(currentDirectory, right);

    return (
      rightScore.sharedPrefixLength - leftScore.sharedPrefixLength ||
      leftScore.depth - rightScore.depth ||
      compareSlugs(left, right)
    );
  });

  return bestCandidate ? asFullSlug(bestCandidate) : undefined;
}

function wikiLinkCandidateScore(currentDirectory: string[], slug: string) {
  const simplified = simplifyCandidateSlug(slug);
  const segments = simplified ? simplified.split("/") : [];

  return {
    sharedPrefixLength: sharedPrefixLength(
      currentDirectory,
      segments.slice(0, -1),
    ),
    depth: segments.length,
  };
}

function simplifyCandidateSlug(slug: string): string {
  return slug === "index" ? "" : slug.replace(/\/index$/, "");
}

function sharedPrefixLength(left: readonly string[], right: readonly string[]) {
  let length = 0;
  while (left[length] !== undefined && left[length] === right[length]) {
    length += 1;
  }
  return length;
}

function compareSlugs(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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

function isExplicitRelativeAssetReference(value: string): boolean {
  return /^\.{1,2}\//.test(normalizePath(stripAssetReferenceSuffix(value)));
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
