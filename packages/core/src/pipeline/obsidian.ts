import { visit } from "unist-util-visit";
import type {
  ObsidianBlockId,
  ObsidianCallout,
  ObsidianComment,
  ObsidianEmbedSize,
  ObsidianHighlight,
  ObsidianInlineFootnote,
  ObsidianTag,
  ObsidianWikiEmbed,
  ObsidianWikilink,
} from "@silicajs/remark-obsidian";
import type { Nodes, PhrasingContent, Root, RootContent } from "mdast";
import type { Properties } from "hast";
import { slug as slugifyHeading } from "github-slugger";
import { tagToHref } from "../tags.js";
import { resolveWikiLink, slugToHref } from "../path.js";
import type { RenderContext } from "../types.js";

declare module "mdast" {
  interface Data {
    silicaBroken?: boolean;
    silicaResolvedSlug?: string;
    silicaEmbedHtml?: string;
    hProperties?: Properties;
  }
}

type VFileLike = {
  data: Record<string, unknown>;
};

type SilicaMdastNode = Nodes;

type MdastParent = Extract<Nodes, { children: unknown[] }>;

type HastNode = {
  type: "element" | "text" | "raw";
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type HandlerState = {
  all: (node: Nodes) => HastNode[];
};

export function remarkSilicaObsidian(context: RenderContext) {
  return async (tree: Root, file: VFileLike) => {
    const links = new Set<string>();
    const brokenLinks: Array<{ target: string }> = [];
    const assetBaseUrl = context.assetBaseUrl ?? "/silica";
    const embedPromises: Array<Promise<void>> = [];

    transformInlineFootnotes(tree);

    visit(tree, (node: SilicaMdastNode) => {
      if (node.type === "image" && typeof node.url === "string") {
        node.url = rewriteAssetUrl(node.url, assetBaseUrl);
        applyImageSize(node);
        return;
      }

      if (!isWikiNode(node)) return;
      if (node.type === "obsidianWikiEmbed" && !isAssetTarget(node.rawTarget)) {
        embedPromises.push(resolveEmbedNode(node, context));
      }

      const targetPath = node.linkTarget.path || String(context.slug);
      if (node.type === "obsidianWikiEmbed" && isAssetTarget(node.rawTarget)) {
        return;
      }

      const resolved = resolveWikiLink(
        context.slug,
        targetPath,
        context.wikilinkIndex,
        context.wikilinkStrategy ?? "shortest",
        context.ordering,
      );

      node.data = { ...node.data };
      if (!resolved) {
        node.data.silicaBroken = true;
        brokenLinks.push({ target: node.rawTarget });
        return;
      }

      node.data.silicaResolvedSlug = resolved;
      links.add(resolved);
    });

    await Promise.all(embedPromises);
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
      if (node.rawTarget && isAssetTarget(node.rawTarget)) {
        return assetEmbedToHast(context, node);
      }
      const embedHtml = getStringData(node, "silicaEmbedHtml");
      if (embedHtml) {
        return {
          type: "element",
          tagName: "figure",
          properties: {
            className: ["silica-embed", "silica-note-embed"],
            "data-embed-kind": "note",
            "data-embed-target": node.rawTarget,
          },
          children: [{ type: "raw", value: embedHtml }],
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
    obsidianComment(_state: HandlerState, _node: ObsidianComment) {
      return { type: "text", value: "" };
    },
    obsidianBlockId(_state: HandlerState, node: ObsidianBlockId) {
      return {
        type: "element",
        tagName: "span",
        properties: {
          id: `^${node.id}`,
          className: ["silica-block-id"],
          "data-silica-block-id": node.id,
          ariaHidden: "true",
        },
        children: [],
      };
    },
  };
}

function transformInlineFootnotes(tree: Root) {
  const definitions: RootContent[] = [];
  let nextIndex = 1;

  visit(
    tree,
    "obsidianInlineFootnote",
    (node: ObsidianInlineFootnote, index, parent: MdastParent | undefined) => {
      if (index === undefined || !parent) return;
      const identifier = `obsidian-inline-${nextIndex++}`;
      parent.children[index] = {
        type: "footnoteReference",
        identifier,
        label: identifier,
      } as PhrasingContent;
      definitions.push({
        type: "footnoteDefinition",
        identifier,
        label: identifier,
        children: [
          {
            type: "paragraph",
            children: node.children.length
              ? node.children
              : [{ type: "text", value: node.value }],
          },
        ],
      } as RootContent);
    },
  );

  tree.children.push(...definitions);
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
    properties: { href: `${slugToHref(resolved)}${targetFragment(node)}` },
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
    typeof node.rawTarget === "string"
  );
}

function getResolvedSlug(node: SilicaMdastNode): string | undefined {
  const value = node.data?.silicaResolvedSlug;
  return typeof value === "string" ? value : undefined;
}

function getStringData(node: SilicaMdastNode, key: string): string | undefined {
  const value = (node.data as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : undefined;
}

async function resolveEmbedNode(
  node: ObsidianWikiEmbed & { data?: Record<string, unknown> },
  context: RenderContext,
): Promise<void> {
  if (!context.resolveEmbed) return;
  const maxDepth = context.maxEmbedDepth ?? 3;
  const depth = context.embedDepth ?? 0;
  if (depth >= maxDepth) return;
  const html = await context.resolveEmbed(node.linkTarget);
  if (!html) return;
  node.data = {
    ...node.data,
    silicaEmbedHtml: html,
  };
}

function assetEmbedToHast(
  context: RenderContext,
  node: ObsidianWikiEmbed,
): HastNode {
  const kind = assetKind(node.rawTarget);
  const src = assetUrl(context.assetBaseUrl ?? "/silica", node.rawTarget);
  const label =
    node.alias || node.rawTarget.split("/").at(-1) || node.rawTarget;
  const dimensions = sizeProperties(
    node.embedSize ?? sizeFromParams(node.linkTarget.params),
  );

  if (kind === "image") {
    return {
      type: "element",
      tagName: "img",
      properties: {
        src,
        alt: label,
        ...dimensions,
      },
      children: [],
    };
  }

  if (kind === "audio" || kind === "video") {
    return {
      type: "element",
      tagName: kind,
      properties: {
        src,
        controls: true,
        ...dimensions,
      },
      children: [],
    };
  }

  return {
    type: "element",
    tagName: "silica-embed",
    properties: {
      src,
      "data-embed-kind": kind,
      "data-embed-target": node.rawTarget,
      ...dimensions,
    },
    children: [{ type: "text", value: label }],
  };
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

function applyImageSize(node: SilicaMdastNode) {
  const size = node.data?.obsidianEmbedSize as ObsidianEmbedSize | undefined;
  if (!size) return;
  node.data = {
    ...node.data,
    hProperties: {
      ...(node.data?.hProperties ?? {}),
      ...sizeProperties(size),
    },
  };
}

function sizeFromParams(
  params: Record<string, string> | undefined,
): ObsidianEmbedSize | undefined {
  const height = Number(params?.height);
  if (!Number.isFinite(height) || height <= 0) return;
  return { width: 0, height };
}

function sizeProperties(size: ObsidianEmbedSize | undefined) {
  if (!size) return {};
  return {
    ...(size.width > 0 ? { width: size.width } : {}),
    ...(size.height ? { height: size.height } : {}),
  };
}

function rewriteAssetUrl(url: string, assetBaseUrl: string): string {
  if (!isAssetTarget(url)) return url;
  if (/^(?:https?:|#|\/)/.test(url)) return url;
  return `${assetBaseUrl}/${url.replace(/^\.?\//, "")}`;
}

function isAssetTarget(target: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|mp3|wav|ogg|canvas)(?:[?#].*)?$/i.test(
    target,
  );
}

function isImageTarget(target: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(target);
}

function assetKind(
  target: string,
): "image" | "audio" | "video" | "pdf" | "canvas" | "file" {
  if (isImageTarget(target)) return "image";
  if (/\.(mp3|wav|ogg)(?:[?#].*)?$/i.test(target)) return "audio";
  if (/\.(mp4|mov)(?:[?#].*)?$/i.test(target)) return "video";
  if (/\.pdf(?:[?#].*)?$/i.test(target)) return "pdf";
  if (/\.canvas(?:[?#].*)?$/i.test(target)) return "canvas";
  return "file";
}

function assetUrl(assetBaseUrl: string, target: string): string {
  const cleaned = stripEmbedOnlyParams(target);
  if (/^(?:https?:|#|\/)/.test(cleaned)) return cleaned;
  return `${assetBaseUrl}/${cleaned.replace(/^\/+/, "")}`;
}

function stripEmbedOnlyParams(target: string): string {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) return target;
  const before = target.slice(0, hashIndex);
  const fragment = target.slice(hashIndex + 1);
  if (!fragment.includes("=")) return target;
  const params = new URLSearchParams(fragment);
  params.delete("height");
  const remaining = params.toString();
  return remaining ? `${before}#${remaining}` : before;
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}
