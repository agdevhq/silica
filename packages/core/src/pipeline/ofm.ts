import { resolveWikiLink, slugToHref } from "../path.js";
import type { BrokenLink, RenderContext } from "../types.js";

export type OfmTransformResult = {
  markdown: string;
  links: string[];
  brokenLinks: BrokenLink[];
};

const WIKI_EMBED = /!\[\[([^\]]+)]]/g;
const WIKI_LINK = /\[\[([^\]]+)]]/g;

export function transformObsidianMarkdown(markdown: string, context: RenderContext): OfmTransformResult {
  const links = new Set<string>();
  const brokenLinks: BrokenLink[] = [];
  const assetBase = context.assetBaseUrl ?? "/silica";

  let transformed = markdown
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/==([^=\n][\s\S]*?)==/g, "<mark>$1</mark>")
    .replace(WIKI_EMBED, (_match, inner: string) => {
      const [target, label] = splitWikiTarget(inner);
      if (isAssetTarget(target)) {
        const src = `${assetBase}/${target.replace(/^\/+/, "")}`;
        const alt = label || target.split("/").at(-1) || target;
        return `![${alt}](${src})`;
      }
      const resolved = resolveLinkedSlug(target, context, brokenLinks);
      if (!resolved) return `<span class="silica-broken-link">${label || target}</span>`;
      links.add(resolved);
      return `[${label || target}](${slugToHref(resolved)})`;
    })
    .replace(WIKI_LINK, (_match, inner: string) => {
      const [target, label] = splitWikiTarget(inner);
      const resolved = resolveLinkedSlug(target, context, brokenLinks);
      if (!resolved) return `<span class="silica-broken-link">${label || target}</span>`;
      links.add(resolved);
      return `[${label || target}](${slugToHref(resolved)})`;
    })
    .replace(/^> \[!(\w+)]\s*(.*)$/gm, (_match, kind: string, title: string) => {
      const display = title || kind[0]!.toUpperCase() + kind.slice(1);
      return `> <strong class="silica-callout-title" data-callout="${kind.toLowerCase()}">${display}</strong>`;
    });

  transformed = rewriteRelativeAssets(transformed, assetBase);

  return {
    markdown: transformed,
    links: [...links],
    brokenLinks,
  };
}

function splitWikiTarget(inner: string): [string, string?] {
  const [target, label] = inner.split("|");
  return [(target ?? "").trim(), label?.trim()];
}

function resolveLinkedSlug(target: string, context: RenderContext, brokenLinks: BrokenLink[]): string | undefined {
  const resolved = resolveWikiLink(
    context.slug,
    target,
    context.allSlugs,
    context.wikilinkStrategy ?? "shortest",
  );

  if (!resolved) {
    brokenLinks.push({ source: String(context.slug), target });
    return undefined;
  }

  return resolved;
}

function isAssetTarget(target: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|mp3|wav|ogg)$/i.test(target);
}

function rewriteRelativeAssets(markdown: string, assetBase: string): string {
  return markdown.replace(/(!?\[[^\]]*])\((?!https?:|#|\/)([^)]+)\)/g, (match, label: string, target: string) => {
    if (!isAssetTarget(target)) return match;
    return `${label}(${assetBase}/${target.replace(/^\.?\//, "")})`;
  });
}
