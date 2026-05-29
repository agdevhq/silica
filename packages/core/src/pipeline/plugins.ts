import Slugger from "github-slugger";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import type { BrokenLink, TocItem } from "../types.js";
import { hrefToSlug } from "../path.js";

type VFileLike = {
  data: Record<string, unknown>;
};

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export function rehypeCollectTocAndLinks() {
  return (tree: HastNode, file: VFileLike) => {
    const toc: TocItem[] = [];
    const links = new Set<string>();
    const slugger = new Slugger();

    visit(tree, "element", (node: HastNode) => {
      if (isHeading(node)) {
        const text = toString(node as never);
        const id = String(node.properties?.id ?? slugger.slug(text));
        node.properties = { ...node.properties, id };
        if (id !== "footnote-label") {
          toc.push({ id, text, depth: Number(node.tagName?.slice(1) ?? 2) });
        }
      }

      if (node.tagName === "a" && typeof node.properties?.href === "string") {
        const href = node.properties.href;
        if (href.startsWith("/") && !href.startsWith("/silica/")) {
          links.add(hrefToSlug(href));
        }
      }
    });

    file.data.toc = toc;
    file.data.links = [...links];
  };
}

export function rehypeCleanFootnoteHeadings() {
  return (tree: HastNode) => {
    visit(tree, "element", (node: HastNode) => {
      if (node.properties?.id !== "footnote-label") return;
      const child = node.children?.[0];
      if (child?.tagName !== "a") return;
      node.children = child.children ?? [];
    });
  };
}

export function rehypeExternalLinks() {
  return (tree: HastNode) => {
    visit(tree, "element", (node: HastNode) => {
      if (node.tagName !== "a" || typeof node.properties?.href !== "string")
        return;
      if (!/^https?:\/\//.test(node.properties.href)) return;
      node.properties = {
        ...node.properties,
        rel: "noreferrer noopener",
        target: "_blank",
      };
    });
  };
}

export function rehypeUnwrapSilicaEmbeds() {
  return (tree: HastNode) => {
    unwrapStandaloneEmbeds(tree);
  };
}

export function rehypeRestoreObsidianBlockIds() {
  return (tree: HastNode) => {
    restoreGeneratedFootnoteIds(tree);

    visit(tree, "element", (node: HastNode) => {
      if (node.tagName !== "span") return;
      const blockId = getStringProperty(
        node,
        "dataSilicaBlockId",
        "data-silica-block-id",
      );
      if (!blockId) return;
      node.properties = { ...node.properties, id: `^${blockId}` };
    });
  };
}

export function getDataArray<T>(
  data: Record<string, unknown>,
  key: string,
): T[] {
  const value = data[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mergeBrokenLinks(
  a: BrokenLink[],
  b: BrokenLink[],
): BrokenLink[] {
  const seen = new Set<string>();
  const merged: BrokenLink[] = [];
  for (const item of [...a, ...b]) {
    const key = `${item.source}\0${item.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function isHeading(node: HastNode): boolean {
  return node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "");
}

function getStringProperty(
  node: HastNode,
  camelCaseKey: string,
  kebabCaseKey: string,
): string | undefined {
  const value =
    node.properties?.[camelCaseKey] ?? node.properties?.[kebabCaseKey];
  return typeof value === "string" ? value : undefined;
}

function restoreGeneratedFootnoteIds(node: HastNode, inFootnotes = false) {
  const isFootnotes = inFootnotes || isFootnotesSection(node);
  if (isFootnotes || isFootnoteReference(node)) {
    normalizeGeneratedFootnoteProperties(node);
  }

  for (const child of node.children ?? []) {
    restoreGeneratedFootnoteIds(child, isFootnotes);
  }
}

function normalizeGeneratedFootnoteProperties(node: HastNode) {
  if (!node.properties) return;
  normalizeProperty(node, "id");
  normalizeProperty(node, "href");
  normalizeProperty(node, "ariaDescribedBy");
  normalizeProperty(node, "aria-describedby");
}

function normalizeProperty(node: HastNode, key: string) {
  const value = node.properties?.[key];
  if (typeof value !== "string") return;
  node.properties = {
    ...node.properties,
    [key]: normalizeGeneratedFootnoteReference(value),
  };
}

function normalizeGeneratedFootnoteReference(value: string): string {
  const prefix = value.startsWith("#") ? "#" : "";
  const id = prefix ? value.slice(1) : value;
  if (id === "user-content-footnote-label") return `${prefix}footnote-label`;
  if (id.startsWith("user-content-user-content-fn")) {
    return `${prefix}${id.replace(/^user-content-/, "")}`;
  }
  return value;
}

function isFootnotesSection(node: HastNode): boolean {
  return (
    node.tagName === "section" &&
    hasProperty(node, "dataFootnotes", "data-footnotes")
  );
}

function isFootnoteReference(node: HastNode): boolean {
  return (
    node.tagName === "a" &&
    hasProperty(node, "dataFootnoteRef", "data-footnote-ref")
  );
}

function hasProperty(
  node: HastNode,
  camelCaseKey: string,
  kebabCaseKey: string,
): boolean {
  return (
    node.properties?.[camelCaseKey] !== undefined ||
    node.properties?.[kebabCaseKey] !== undefined
  );
}

function unwrapStandaloneEmbeds(parent: HastNode) {
  if (!parent.children) return;

  parent.children = parent.children.map((child) => {
    unwrapStandaloneEmbeds(child);
    if (child.tagName !== "p") return child;

    const renderedChildren = child.children?.filter(
      (candidate) => !isWhitespaceText(candidate),
    );
    const onlyChild = renderedChildren?.[0];
    if (renderedChildren?.length === 1 && isStandaloneEmbed(onlyChild)) {
      return onlyChild;
    }
    return child;
  });
}

function isStandaloneEmbed(node: HastNode | undefined): node is HastNode {
  if (node?.tagName === "silica-embed") return true;
  if (node?.tagName !== "figure") return false;
  const kind =
    node.properties?.dataEmbedKind ?? node.properties?.["data-embed-kind"];
  return kind === "note";
}

function isWhitespaceText(node: HastNode): boolean {
  return node.type === "text" && /^\s*$/.test(node.value ?? "");
}
