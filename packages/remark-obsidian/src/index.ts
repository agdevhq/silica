export type ObsidianLinkResolver = (target: string) => string | undefined;

export type RemarkObsidianOptions = {
  assetBaseUrl?: string;
  inlineTags?: boolean;
  resolveWikilink: ObsidianLinkResolver;
  slugToHref: (slug: string) => string;
};

export type InlineTagMatch = {
  tag: string;
  raw: string;
  start: number;
  end: number;
};

type VFileLike = {
  data: Record<string, unknown>;
};

type MdastNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  title?: string | null;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

type CrossNodeWikiLink = {
  startIndex: number;
  endIndex: number;
  before: string;
  inner: string;
  after: string;
  embed: boolean;
};

type TransformState = {
  assetBaseUrl: string;
  inlineTags: boolean;
  links: Set<string>;
  brokenLinks: Array<{ source?: string; target: string }>;
  options: RemarkObsidianOptions;
};

const WIKI_EMBED_PREFIX = "![[";
const WIKI_LINK_PREFIX = "[[";
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

export function remarkObsidian(options: RemarkObsidianOptions) {
  return (tree: MdastNode, file: VFileLike) => {
    const state: TransformState = {
      assetBaseUrl: options.assetBaseUrl ?? "/silica",
      inlineTags: options.inlineTags ?? true,
      links: new Set(),
      brokenLinks: [],
      options,
    };

    transformTree(tree, state);

    file.data.obsidianLinks = [...state.links];
    file.data.obsidianBrokenLinks = state.brokenLinks;
  };
}

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

export function tagToHref(tag: string): string {
  const normalized = normalizeTag(tag);
  if (!normalized) return "/tags";
  const encoded = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/tags/${encoded}`;
}

function transformTree(node: MdastNode, state: TransformState): void {
  if (node.type === "blockquote") {
    transformCallout(node);
  }

  if (node.type === "image" && typeof node.url === "string") {
    node.url = rewriteAssetUrl(node.url, state.assetBaseUrl);
  }

  if (!node.children || shouldSkipChildren(node)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (!child) continue;

    const crossNodeWikiLink = findCrossNodeWikiLink(node.children, index);
    if (crossNodeWikiLink) {
      const replacement = [
        ...transformText(crossNodeWikiLink.before, state),
        createWikiNode(crossNodeWikiLink.inner, crossNodeWikiLink.embed, state),
        ...transformText(crossNodeWikiLink.after, state),
      ];
      node.children.splice(
        crossNodeWikiLink.startIndex,
        crossNodeWikiLink.endIndex - crossNodeWikiLink.startIndex + 1,
        ...replacement,
      );
      index += replacement.length - 1;
      continue;
    }

    if (child.type === "text" && typeof child.value === "string") {
      const replacement = transformText(child.value, state);
      node.children.splice(index, 1, ...replacement);
      index += replacement.length - 1;
      continue;
    }

    transformTree(child, state);
  }
}

function findCrossNodeWikiLink(
  siblings: MdastNode[],
  startIndex: number,
): CrossNodeWikiLink | undefined {
  const start = siblings[startIndex];
  if (start?.type !== "text" || typeof start.value !== "string") return;

  const embedIndex = start.value.indexOf(WIKI_EMBED_PREFIX);
  const linkIndex = start.value.indexOf(WIKI_LINK_PREFIX);
  const candidates = [
    embedIndex === -1
      ? undefined
      : { index: embedIndex, prefix: WIKI_EMBED_PREFIX, embed: true },
    linkIndex === -1
      ? undefined
      : { index: linkIndex, prefix: WIKI_LINK_PREFIX, embed: false },
  ].filter(Boolean) as Array<{
    index: number;
    prefix: string;
    embed: boolean;
  }>;
  const candidate = candidates.sort(
    (left, right) => left.index - right.index,
  )[0];
  if (!candidate) return;
  if (
    start.value.indexOf("]]", candidate.index + candidate.prefix.length) !== -1
  ) {
    return;
  }

  let inner = start.value.slice(candidate.index + candidate.prefix.length);
  for (
    let endIndex = startIndex + 1;
    endIndex < siblings.length;
    endIndex += 1
  ) {
    const current = siblings[endIndex];
    if (!current || !canJoinWikiNode(current)) return;

    const value = current.value ?? "";
    const closeIndex = value.indexOf("]]");
    if (closeIndex === -1) {
      inner += value;
      continue;
    }

    inner += value.slice(0, closeIndex);
    return {
      startIndex,
      endIndex,
      before: start.value.slice(0, candidate.index),
      inner,
      after: value.slice(closeIndex + 2),
      embed: candidate.embed,
    };
  }
}

function canJoinWikiNode(node: MdastNode): boolean {
  return (
    (node.type === "text" || node.type === "html") &&
    typeof node.value === "string"
  );
}

function shouldSkipChildren(node: MdastNode): boolean {
  return (
    node.type === "link" ||
    node.type === "linkReference" ||
    node.type === "image" ||
    node.type === "imageReference" ||
    node.type === "definition" ||
    node.type === "code" ||
    node.type === "inlineCode" ||
    node.type === "html"
  );
}

function transformText(value: string, state: TransformState): MdastNode[] {
  const nodes: MdastNode[] = [];
  let text = "";

  function flushText() {
    if (!text) return;
    nodes.push({ type: "text", value: text });
    text = "";
  }

  for (let index = 0; index < value.length; index += 1) {
    if (value.startsWith("%%", index)) {
      const end = value.indexOf("%%", index + 2);
      if (end !== -1) {
        flushText();
        index = end + 1;
        continue;
      }
    }

    if (value.startsWith(WIKI_EMBED_PREFIX, index)) {
      const end = value.indexOf("]]", index + WIKI_EMBED_PREFIX.length);
      if (end !== -1) {
        flushText();
        nodes.push(
          createWikiNode(
            value.slice(index + WIKI_EMBED_PREFIX.length, end),
            true,
            state,
          ),
        );
        index = end + 1;
        continue;
      }
    }

    if (value.startsWith(WIKI_LINK_PREFIX, index)) {
      const end = value.indexOf("]]", index + WIKI_LINK_PREFIX.length);
      if (end !== -1) {
        flushText();
        nodes.push(
          createWikiNode(
            value.slice(index + WIKI_LINK_PREFIX.length, end),
            false,
            state,
          ),
        );
        index = end + 1;
        continue;
      }
    }

    if (value.startsWith("==", index)) {
      const first = value[index + 2];
      const end = value.indexOf("==", index + 2);
      if (first && first !== "=" && first !== "\n" && end !== -1) {
        flushText();
        nodes.push(createMarkNode(value.slice(index + 2, end), state));
        index = end + 1;
        continue;
      }
    }

    if (
      state.inlineTags &&
      value[index] === "#" &&
      hasTagBoundary(value, index)
    ) {
      const inlineTag = readInlineTag(value, index);
      if (inlineTag) {
        flushText();
        nodes.push({
          type: "link",
          url: tagToHref(inlineTag.tag),
          title: null,
          children: [{ type: "text", value: inlineTag.raw }],
        });
        index = inlineTag.end - 1;
        continue;
      }
    }

    text += value[index];
  }

  flushText();
  return nodes;
}

function createWikiNode(
  inner: string,
  embed: boolean,
  state: TransformState,
): MdastNode {
  const [target, label] = splitWikiTarget(inner);
  const display = label || target;

  if (embed && isAssetTarget(target)) {
    const alt = label || target.split("/").at(-1) || target;
    return {
      type: "image",
      url: `${state.assetBaseUrl}/${target.replace(/^\/+/, "")}`,
      title: null,
      alt,
    };
  }

  const resolved = state.options.resolveWikilink(target);
  if (!resolved) {
    state.brokenLinks.push({ target });
    return {
      type: "silicaBrokenLink",
      children: [{ type: "text", value: display }],
      data: {
        hName: "span",
        hProperties: { className: ["silica-broken-link"] },
      },
    };
  }

  state.links.add(resolved);
  return {
    type: "link",
    url: state.options.slugToHref(resolved),
    title: null,
    children: [{ type: "text", value: display }],
  };
}

function createMarkNode(value: string, state: TransformState): MdastNode {
  return {
    type: "silicaMark",
    children: transformText(value, { ...state, inlineTags: false }),
    data: {
      hName: "mark",
    },
  };
}

function transformCallout(node: MdastNode): void {
  const firstParagraph = node.children?.find(
    (child) => child.type === "paragraph",
  );
  const firstText = firstParagraph?.children?.find(
    (child) => child.type === "text" && typeof child.value === "string",
  );
  if (!firstParagraph || !firstText?.value) return;

  const match = firstText.value.match(
    /^\s*\[!([\w-]+)]([+-]?)\s*([^\n]*)?(?:\n)?/,
  );
  if (!match) return;

  const kind = match[1]!.toLowerCase();
  const fold = match[2];
  const title = match[3]?.trim() || titleCase(kind);
  firstText.value = firstText.value.slice(match[0].length);

  firstParagraph.children = firstParagraph.children?.filter((child) => {
    return child.type !== "text" || Boolean(child.value);
  });

  if (firstParagraph.children?.length === 0) {
    node.children = node.children?.filter((child) => child !== firstParagraph);
  }

  node.data = {
    ...node.data,
    hName: "silica-callout",
    hProperties: {
      className: ["silica-callout"],
      "data-callout": kind,
      "data-callout-title": title,
      ...(fold
        ? {
            "data-callout-foldable": "true",
            "data-callout-open": fold === "+" ? "true" : "false",
          }
        : {}),
    },
  };
}

function splitWikiTarget(inner: string): [string, string?] {
  const [target, label] = inner.split("|");
  return [(target ?? "").trim(), label?.trim()];
}

function rewriteAssetUrl(url: string, assetBaseUrl: string): string {
  if (!isAssetTarget(url)) return url;
  if (/^(?:https?:|#|\/)/.test(url)) return url;
  return `${assetBaseUrl}/${url.replace(/^\.?\//, "")}`;
}

function isAssetTarget(target: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|mp3|wav|ogg)$/i.test(target);
}

function readInlineTag(
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

function hasTagBoundary(markdown: string, hashIndex: number): boolean {
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

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
