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
        toc.push({ id, text, depth: Number(node.tagName?.slice(1) ?? 2) });
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

export function rehypeObsidianCallouts() {
  return (tree: HastNode) => {
    visit(tree, "element", (node: HastNode) => {
      if (node.tagName !== "blockquote" || !node.children?.length) return;

      const firstParagraphIndex = node.children.findIndex(
        (child) => child.type === "element" && child.tagName === "p",
      );
      if (firstParagraphIndex === -1) return;

      const firstParagraph = node.children[firstParagraphIndex];
      if (!firstParagraph) return;
      const marker = findCalloutMarker(firstParagraph);
      if (!marker) return;

      const kind = marker.kind || "note";
      const title = marker.title || titleCase(kind);
      const children = [...node.children];
      const remainingParagraph = removeMarkerFromParagraph(
        firstParagraph,
        marker.index,
      );

      if (remainingParagraph) {
        children[firstParagraphIndex] = remainingParagraph;
      } else {
        children.splice(firstParagraphIndex, 1);
      }

      node.tagName = "silica-callout";
      node.properties = {
        className: ["silica-callout"],
        "data-callout": kind,
        "data-callout-title": title,
        ...(marker.fold
          ? {
              "data-callout-foldable": "true",
              "data-callout-open": marker.fold === "open" ? "true" : "false",
            }
          : {}),
      };
      node.children = children;
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

function findCalloutMarker(
  paragraph: HastNode,
): { index: number; kind: string; title: string; fold?: string } | undefined {
  const children = paragraph.children ?? [];
  const index = children.findIndex((child) => {
    if (child.type !== "element" || child.tagName !== "strong") return false;
    return classNames(child).includes("silica-callout-title");
  });
  if (index === -1) return undefined;

  const marker = children[index];
  if (!marker) return undefined;
  const rawKind = getStringProperty(marker, "data-callout", "dataCallout");
  const fold = getStringProperty(
    marker,
    "data-callout-fold",
    "dataCalloutFold",
  );
  return {
    index,
    kind: (rawKind ?? "note").toLowerCase(),
    title: toString(marker as never).trim(),
    fold,
  };
}

function removeMarkerFromParagraph(
  paragraph: HastNode,
  markerIndex: number,
): HastNode | undefined {
  const children = [...(paragraph.children ?? [])];
  children.splice(0, markerIndex + 1);

  const firstChild = children[0];
  if (firstChild?.type === "text" && typeof firstChild.value === "string") {
    firstChild.value = firstChild.value.replace(/^\s+/, "");
  }

  const hasContent = children.some((child) => {
    if (child.type !== "text") return true;
    return Boolean(child.value?.trim());
  });
  if (!hasContent) return undefined;

  return {
    ...paragraph,
    children,
  };
}

function classNames(node: HastNode): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/);
  return [];
}

function getStringProperty(
  node: HastNode,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = node.properties?.[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}
