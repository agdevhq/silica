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
        const text = toString(node);
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
      if (node.tagName !== "a" || typeof node.properties?.href !== "string") return;
      if (!/^https?:\/\//.test(node.properties.href)) return;
      node.properties = {
        ...node.properties,
        rel: "noreferrer noopener",
        target: "_blank",
      };
    });
  };
}

export function getDataArray<T>(data: Record<string, unknown>, key: string): T[] {
  const value = data[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mergeBrokenLinks(a: BrokenLink[], b: BrokenLink[]): BrokenLink[] {
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
