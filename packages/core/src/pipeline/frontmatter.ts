import { slug as slugifyHeading } from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import {
  remarkObsidian,
  type ObsidianWikiEmbed,
  type ObsidianWikilink,
} from "@silicajs/remark-obsidian";
import { resolveWikiLink, slugToHref } from "../path.js";
import type { BrokenLink, RenderContext } from "../types.js";

type PagePropertyTextPart = {
  type: "text";
  value: string;
};

type PagePropertyLinkPart = {
  type: "link";
  value: string;
  target: string;
  slug: string;
  href: string;
};

type PagePropertyBrokenLinkPart = {
  type: "broken-link";
  value: string;
  target: string;
};

export type PagePropertyPart =
  | PagePropertyTextPart
  | PagePropertyLinkPart
  | PagePropertyBrokenLinkPart;

export type PageProperty = {
  key: string;
  label: string;
  value: string;
  parts?: PagePropertyPart[];
};

export type PagePropertyResolution = {
  parts: PagePropertyPart[];
  links: string[];
  brokenLinks: BrokenLink[];
};

type PositionedNode = {
  type: string;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
  children?: PositionedNode[];
};

type PropertyWikiNode = (ObsidianWikilink | ObsidianWikiEmbed) & PositionedNode;

const RESERVED_FRONTMATTER_KEYS = new Set([
  "aliases",
  "alias",
  "created",
  "cssclass",
  "cssclasses",
  "date",
  "description",
  "draft",
  "listed",
  "menu_label",
  "modified",
  "permalink",
  "publish",
  "tag",
  "tags",
  "title",
]);

const ISO_DATE_STRING_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const PAGE_PROPERTY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export function getMenuLabel(
  frontmatter: Record<string, unknown>,
  title: string,
): string {
  if (
    typeof frontmatter.menu_label === "string" &&
    frontmatter.menu_label.trim()
  ) {
    return frontmatter.menu_label.trim();
  }
  return title;
}

export function getPageProperties(
  frontmatter: Record<string, unknown>,
): PageProperty[] {
  return Object.entries(frontmatter)
    .filter(([key]) => !RESERVED_FRONTMATTER_KEYS.has(key.toLowerCase()))
    .map(([key, value]) => {
      const formatted = formatPropertyValue(value);
      if (formatted === undefined) return undefined;
      return {
        key,
        label: formatPropertyLabel(key),
        value: formatted,
      };
    })
    .filter((property): property is PageProperty => property !== undefined)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function getResolvedPageProperties(
  frontmatter: Record<string, unknown>,
  context: RenderContext,
): PageProperty[] {
  return getPageProperties(frontmatter).map((property) => ({
    ...property,
    parts: resolvePagePropertyValue(property.value, context).parts,
  }));
}

export function analyzePagePropertyLinks(
  frontmatter: Record<string, unknown>,
  context: RenderContext,
): { links: string[]; brokenLinks: BrokenLink[] } {
  const links = new Set<string>();
  const brokenLinks: BrokenLink[] = [];

  for (const property of getPageProperties(frontmatter)) {
    const resolution = resolvePagePropertyValue(property.value, context);
    for (const link of resolution.links) links.add(link);
    brokenLinks.push(...resolution.brokenLinks);
  }

  return { links: [...links], brokenLinks };
}

export function resolvePagePropertyValue(
  value: string,
  context: RenderContext,
): PagePropertyResolution {
  const nodes = collectPropertyWikiNodes(value, context);
  if (nodes.length === 0) {
    return {
      parts: [{ type: "text", value }],
      links: [],
      brokenLinks: [],
    };
  }

  const parts: PagePropertyPart[] = [];
  const links = new Set<string>();
  const brokenLinks: BrokenLink[] = [];
  let cursor = 0;

  for (const node of nodes) {
    const range = nodeRange(node);
    if (!range || range.start < cursor) continue;
    if (range.start > cursor) {
      parts.push({ type: "text", value: value.slice(cursor, range.start) });
    }

    const label = node.alias || node.target || "";
    const targetPath = node.linkTarget.path || String(context.slug);
    const resolved = resolvePagePropertyWikiTarget(context, targetPath);
    if (resolved) {
      links.add(resolved);
      parts.push({
        type: "link",
        value: label,
        target: node.rawTarget,
        slug: resolved,
        href: `${slugToHref(resolved)}${targetFragment(node)}`,
      });
    } else {
      brokenLinks.push({
        source: String(context.slug),
        target: node.rawTarget,
      });
      parts.push({
        type: "broken-link",
        value: label,
        target: node.rawTarget,
      });
    }

    cursor = range.end;
  }

  if (cursor < value.length) {
    parts.push({ type: "text", value: value.slice(cursor) });
  }

  return { parts, links: [...links], brokenLinks };
}

export function formatPropertyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

export function formatPropertyValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  if (value instanceof Date) {
    return formatPagePropertyDate(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return formatIsoDateString(trimmed) ?? trimmed;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatPropertyValue(item))
      .filter((item): item is string => item !== undefined);
    return items.length ? items.join(", ") : undefined;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatPagePropertyDate(date: Date): string | undefined {
  if (Number.isNaN(date.getTime())) return undefined;
  return PAGE_PROPERTY_DATE_FORMATTER.format(date);
}

function formatIsoDateString(value: string): string | undefined {
  const match = ISO_DATE_STRING_PATTERN.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return formatPagePropertyDate(date);
}

function collectPropertyWikiNodes(
  value: string,
  context: RenderContext,
): PropertyWikiNode[] {
  const processor = unified()
    .use(remarkParse)
    .use(remarkObsidian, { inlineTags: context.tags?.inline ?? true });
  const tree = processor.parse(value) as PositionedNode;
  const nodes: PropertyWikiNode[] = [];
  visitPropertyNodes(tree, (node) => {
    if (!isPropertyWikiNode(node)) return;
    if (node.type === "obsidianWikiEmbed" && isAssetTarget(node.rawTarget)) {
      return;
    }
    nodes.push(node);
  });
  return nodes.sort(
    (a, b) => (nodeRange(a)?.start ?? 0) - (nodeRange(b)?.start ?? 0),
  );
}

function visitPropertyNodes(
  node: PositionedNode,
  visitor: (node: PositionedNode) => void,
): void {
  visitor(node);
  for (const child of node.children ?? []) {
    visitPropertyNodes(child, visitor);
  }
}

function isPropertyWikiNode(node: PositionedNode): node is PropertyWikiNode {
  return node.type === "obsidianWikilink" || node.type === "obsidianWikiEmbed";
}

function resolvePagePropertyWikiTarget(
  context: RenderContext,
  targetPath: string,
): string | undefined {
  if (context.resolveWikiLink) {
    return context.resolveWikiLink(context.slug, targetPath);
  }
  if (!context.wikilinkIndex) return undefined;
  return resolveWikiLink(
    context.slug,
    targetPath,
    context.wikilinkIndex,
    context.wikilinkStrategy ?? "shortest",
    context.ordering,
  );
}

function nodeRange(
  node: PositionedNode,
): { start: number; end: number } | undefined {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number" || end < start) {
    return undefined;
  }
  return { start, end };
}

function targetFragment(node: ObsidianWikilink | ObsidianWikiEmbed): string {
  if (node.linkTarget.blockId) {
    return `#^${encodeURIComponent(node.linkTarget.blockId)}`;
  }
  if (node.linkTarget.heading) {
    return `#${slugifyHeading(node.linkTarget.heading)}`;
  }
  return "";
}

function isAssetTarget(target: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|mp3|wav|ogg|canvas)(?:[?#].*)?$/i.test(
    target,
  );
}
