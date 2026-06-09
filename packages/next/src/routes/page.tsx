import fs from "node:fs/promises";
import type { AnchorHTMLAttributes } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import {
  getMetaDescription,
  renderMarkdown,
  renderMarkdownHtml,
  type RenderContext,
} from "@silicajs/core/runtime";
import { SilicaLink } from "@silicajs/components/routing";
import {
  getBacklinks,
  getBreadcrumbs,
  getPage,
  getPageRuntimeData,
  getPrerenderSlugs,
  getRenderKey,
  resolveWikiLinkFromDb,
  normalizeRouteSlug,
} from "../server-data.js";
import type { SilicaTheme } from "@silicajs/core/theme";

function MarkdownLink({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href && href.startsWith("/") && !href.startsWith("/silica/")) {
    return <SilicaLink href={href} {...props} />;
  }

  return <a href={href} {...props} />;
}

export async function generateStaticParams() {
  const prerenderSlugs = getPrerenderSlugs();
  const slugs = prerenderSlugs.length
    ? prerenderSlugs
    : ["__silica_prerender_placeholder__"];
  return slugs.map((slug) => ({
    slug: slug === "index" ? [] : slug.split("/"),
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = normalizeRouteSlug(resolvedParams?.slug);
  const renderKey = getRenderKey(slug);
  const entry = await getPageMetadata(
    slug,
    renderKey.renderHash,
    renderKey.renderEnvironmentHash,
  );
  if (!entry) return {};
  return {
    title: entry.title,
    description: getMetaDescription(entry),
  };
}

async function getPageMetadata(
  slug: string,
  renderHash: string,
  renderEnvironmentHash: string,
) {
  "use cache";
  cacheLife("max");
  cacheTag(
    `environment:${renderEnvironmentHash}`,
    `page:${slug}`,
    `render:${renderHash}`,
  );
  return getPage(slug);
}

export type PageProps = {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
};

export async function VaultContent({
  slug,
  renderHash,
  renderEnvironmentHash,
  theme,
}: {
  slug: string;
  renderHash: string;
  renderEnvironmentHash: string;
  theme: SilicaTheme;
}) {
  "use cache";
  cacheLife("max");
  const data = getPageRuntimeData(slug);
  if (!data) notFound();
  const { entry, config } = data;
  cacheTag(
    `environment:${renderEnvironmentHash}`,
    `page:${slug}`,
    `render:${renderHash}`,
  );

  const renderContext = (
    currentSlug: string,
    embedDepth = 0,
  ): RenderContext => ({
    slug: currentSlug,
    resolveWikiLink: (_currentSlug, target) =>
      resolveWikiLinkFromDb(
        currentSlug,
        target,
        config.wikilinks.strategy,
        config.ordering,
      ),
    assetBaseUrl: "/silica",
    wikilinkStrategy: config.wikilinks.strategy,
    tags: config.tags,
    ordering: config.ordering,
    embedDepth,
    maxEmbedDepth: 3,
    components: {
      ...theme.components,
      a: MarkdownLink,
    },
    resolveEmbed: async (target) => {
      const resolved = resolveWikiLinkFromDb(
        currentSlug,
        target.path || currentSlug,
        config.wikilinks.strategy,
        config.ordering,
      );
      if (!resolved || embedDepth >= 3) return;
      const embeddedEntry = getPage(resolved);
      if (!embeddedEntry) return;
      const embeddedRaw = await fs.readFile(embeddedEntry.file, "utf8");
      const scopedRaw = scopeEmbedMarkdown(embeddedRaw, target);
      return renderMarkdownHtml(
        scopedRaw,
        renderContext(resolved, embedDepth + 1),
      );
    },
  });

  const raw = await fs.readFile(entry.file, "utf8");
  const rendered = await renderMarkdown(raw, renderContext(slug));

  return (
    <theme.PageRenderer
      config={config}
      breadcrumbs={getBreadcrumbs(slug)}
      backlinks={getBacklinks(slug)}
      page={{
        slug,
        title: entry.title,
        description: entry.description,
        content: rendered.content,
        frontmatter: entry.frontmatter,
        toc: rendered.toc,
        tags: entry.tags,
        entry,
      }}
    />
  );
}

function scopeEmbedMarkdown(
  raw: string,
  target: Parameters<NonNullable<RenderContext["resolveEmbed"]>>[0],
): string {
  if (target.blockId) return extractBlock(raw, target.blockId) ?? raw;
  if (target.heading) return extractHeadingSection(raw, target.heading) ?? raw;
  return raw;
}

function extractHeadingSection(
  raw: string,
  heading: string,
): string | undefined {
  const lines = raw.split(/\r?\n/);
  const expected = normalizeHeading(heading);
  const start = lines.findIndex((line) => {
    const parsed = parseHeading(line);
    return parsed ? normalizeHeading(parsed.text) === expected : false;
  });
  if (start === -1) return;

  const startHeading = parseHeading(lines[start] ?? "");
  if (!startHeading) return;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const nextHeading = parseHeading(lines[index] ?? "");
    if (nextHeading && nextHeading.depth <= startHeading.depth) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n").trim();
}

function extractBlock(raw: string, blockId: string): string | undefined {
  const lines = raw.split(/\r?\n/);
  const blockIdPattern = new RegExp(
    `(^|\\s)\\^${escapeRegExp(blockId)}(?=\\s|$)`,
  );
  const matchIndex = lines.findIndex((line) => blockIdPattern.test(line));
  if (matchIndex === -1) return;

  let start = matchIndex;
  while (start > 0 && lines[start - 1]?.trim()) start -= 1;

  let end = matchIndex + 1;
  while (end < lines.length && lines[end]?.trim()) end += 1;

  return lines.slice(start, end).join("\n").replace(blockIdPattern, "").trim();
}

function parseHeading(
  line: string,
): { depth: number; text: string } | undefined {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!match) return;
  return {
    depth: match[1]!.length,
    text: match[2]!,
  };
}

function normalizeHeading(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
