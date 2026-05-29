import { visit } from "unist-util-visit";
import type {
  ObsidianCallout,
  ObsidianHighlight,
  ObsidianTag,
  ObsidianWikiEmbed,
  ObsidianWikilink,
} from "@silicajs/remark-obsidian";
import type { Nodes, Root } from "mdast";
import { tagToHref } from "../tags.js";
import { resolveWikiLink, slugToHref } from "../path.js";
import type { RenderContext } from "../types.js";

declare module "mdast" {
  interface Data {
    silicaBroken?: boolean;
    silicaResolvedSlug?: string;
  }
}

type VFileLike = {
  data: Record<string, unknown>;
};

type SilicaMdastNode = Nodes;

type HastNode = {
  type: "element" | "text";
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type HandlerState = {
  all: (node: Nodes) => HastNode[];
};

export function remarkSilicaObsidian(context: RenderContext) {
  return (tree: Root, file: VFileLike) => {
    const links = new Set<string>();
    const brokenLinks: Array<{ target: string }> = [];
    const assetBaseUrl = context.assetBaseUrl ?? "/silica";

    visit(tree, (node: SilicaMdastNode) => {
      if (node.type === "image" && typeof node.url === "string") {
        node.url = rewriteAssetUrl(node.url, assetBaseUrl);
        return;
      }

      if (!isWikiNode(node)) return;
      if (node.type === "obsidianWikiEmbed" && isAssetTarget(node.target)) {
        return;
      }

      const resolved = resolveWikiLink(
        context.slug,
        node.target,
        context.allSlugs,
        context.wikilinkStrategy ?? "shortest",
        context.ordering,
      );

      node.data = { ...node.data };
      if (!resolved) {
        node.data.silicaBroken = true;
        brokenLinks.push({ target: node.target });
        return;
      }

      node.data.silicaResolvedSlug = resolved;
      links.add(resolved);
    });

    file.data.silicaObsidianLinks = [...links];
    file.data.silicaObsidianBrokenLinks = brokenLinks;
  };
}

export function createSilicaObsidianHandlers(context: RenderContext) {
  return {
    obsidianWikilink(
      state: HandlerState,
      node: ObsidianWikilink & { data?: Record<string, unknown> },
    ) {
      return wikilinkToHast(state, node);
    },
    obsidianWikiEmbed(
      state: HandlerState,
      node: ObsidianWikiEmbed & { data?: Record<string, unknown> },
    ) {
      if (node.target && isAssetTarget(node.target)) {
        return {
          type: "element",
          tagName: "img",
          properties: {
            src: `${context.assetBaseUrl ?? "/silica"}/${node.target.replace(/^\/+/, "")}`,
            alt: node.alias || node.target.split("/").at(-1) || node.target,
          },
          children: [],
        };
      }
      return wikilinkToHast(state, node);
    },
    obsidianHighlight(state: HandlerState, node: ObsidianHighlight) {
      return {
        type: "element",
        tagName: "mark",
        properties: {},
        children: state.all(node),
      };
    },
    obsidianCallout(state: HandlerState, node: ObsidianCallout) {
      return {
        type: "element",
        tagName: "silica-callout",
        properties: {
          className: ["silica-callout"],
          "data-callout": node.kind ?? "note",
          "data-callout-title": node.title ?? titleCase(node.kind ?? "note"),
          ...(node.fold
            ? {
                "data-callout-foldable": "true",
                "data-callout-open": node.fold === "open" ? "true" : "false",
              }
            : {}),
        },
        children: state.all(node),
      };
    },
    obsidianTag(state: HandlerState, node: ObsidianTag) {
      return {
        type: "element",
        tagName: "a",
        properties: { href: tagToHref(node.tag ?? "") },
        children: state.all(node),
      };
    },
  };
}

function wikilinkToHast(
  _state: HandlerState,
  node: (ObsidianWikilink | ObsidianWikiEmbed) & {
    data?: Record<string, unknown>;
  },
): HastNode {
  const label = node.alias || node.target || "";
  const resolved = getResolvedSlug(node);
  if (!resolved) {
    return {
      type: "element",
      tagName: "span",
      properties: { className: ["silica-broken-link"] },
      children: [{ type: "text", value: label }],
    };
  }

  return {
    type: "element",
    tagName: "a",
    properties: { href: slugToHref(resolved) },
    children: [{ type: "text", value: label }],
  };
}

function isWikiNode(node: SilicaMdastNode): node is (
  | ObsidianWikilink
  | ObsidianWikiEmbed
) & {
  data?: Record<string, unknown>;
} {
  return (
    (node.type === "obsidianWikilink" || node.type === "obsidianWikiEmbed") &&
    typeof node.target === "string"
  );
}

function getResolvedSlug(node: SilicaMdastNode): string | undefined {
  const value = node.data?.silicaResolvedSlug;
  return typeof value === "string" ? value : undefined;
}

function rewriteAssetUrl(url: string, assetBaseUrl: string): string {
  if (!isAssetTarget(url)) return url;
  if (/^(?:https?:|#|\/)/.test(url)) return url;
  return `${assetBaseUrl}/${url.replace(/^\.?\//, "")}`;
}

function isAssetTarget(target: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|mp3|wav|ogg)$/i.test(target);
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}
