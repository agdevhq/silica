import fs from "node:fs/promises";
import type { AnchorHTMLAttributes } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import {
  getMetaDescription,
  getResolvedPageProperties,
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
  resolveAssetFromDb,
  resolveWikiLinkFromDb,
  normalizeRouteSlug,
} from "../server-data.js";
import {
  logSilicaTiming,
  nowSilicaTimingMs,
  roundTimingMs,
  timeSilica,
  timeSilicaAsync,
} from "../server-timing.js";
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
  return timeSilica("page.generate-static-params", {}, () => {
    const prerenderSlugs = timeSilica(
      "page.get-prerender-slugs",
      {},
      getPrerenderSlugs,
    );
    const slugs = prerenderSlugs.length
      ? prerenderSlugs
      : ["__silica_prerender_placeholder__"];
    logSilicaTiming("page.static-params", {
      prerenderSlugCount: prerenderSlugs.length,
      returnedSlugCount: slugs.length,
    });
    return slugs.map((slug) => ({
      slug: slug === "index" ? [] : slug.split("/"),
    }));
  });
}

export async function generateMetadata({ params }: PageProps) {
  return timeSilicaAsync("page.generate-metadata", {}, async () => {
    const resolvedParams = await timeSilicaAsync(
      "page.metadata.params",
      {},
      () => Promise.resolve(params),
    );
    const slug = timeSilica("page.metadata.normalize-slug", {}, () =>
      normalizeRouteSlug(resolvedParams?.slug),
    );
    const renderKey = timeSilica("page.metadata.render-key", { slug }, () =>
      getRenderKey(slug),
    );
    const entry = await getPageMetadata(
      slug,
      renderKey.renderHash,
      renderKey.renderEnvironmentHash,
    );
    logSilicaTiming("page.metadata.result", {
      slug,
      found: Boolean(entry),
    });
    if (!entry) return {};
    return {
      title: entry.title,
      description: getMetaDescription(entry),
    };
  });
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
  logSilicaTiming("page.metadata.cache-miss", {
    slug,
    renderHash,
    renderEnvironmentHash,
  });
  return timeSilica("page.metadata.get-page", { slug }, () => getPage(slug));
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
  const startedAt = nowSilicaTimingMs();
  const metrics = createVaultRenderMetrics();
  logSilicaTiming("vault-content.cache-miss.start", {
    slug,
    renderHash,
    renderEnvironmentHash,
  });
  cacheLife("max");
  const data = timeSilica("vault-content.runtime-data", { slug }, () =>
    getPageRuntimeData(slug),
  );
  if (!data) {
    logSilicaTiming("vault-content.not-found", { slug });
    notFound();
  }
  const { entry, config } = data;
  cacheTag(
    `environment:${renderEnvironmentHash}`,
    `page:${slug}`,
    `render:${renderHash}`,
  );

  const renderContext = (
    currentSlug: string,
    currentSourcePath: string,
    embedDepth = 0,
  ): RenderContext => ({
    slug: currentSlug,
    sourcePath: currentSourcePath,
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
    resolveWikiLink: (_currentSlug, target) =>
      measureVaultRenderMetric(metrics, "wikiLink", () =>
        resolveWikiLinkFromDb(
          currentSlug,
          target,
          config.wikilinks.strategy,
          config.ordering,
        ),
      ),
    resolveAsset: (_currentSourcePath, target) =>
      measureVaultRenderMetric(metrics, "asset", () =>
        resolveAssetFromDb(
          currentSourcePath,
          target,
          config.wikilinks.strategy,
          config.ordering,
        ),
      ),
    resolveEmbed: async (target) =>
      measureVaultRenderMetricAsync(metrics, "embed", async () => {
        const resolved = resolveWikiLinkFromDb(
          currentSlug,
          target.path || currentSlug,
          config.wikilinks.strategy,
          config.ordering,
        );
        if (!resolved || embedDepth >= 3) return;
        const embeddedEntry = getPage(resolved);
        if (!embeddedEntry) return;
        const embeddedRaw = await timeSilicaAsync(
          "vault-content.embed.read-source",
          { slug: currentSlug, embedSlug: resolved, file: embeddedEntry.file },
          () => fs.readFile(embeddedEntry.file, "utf8"),
        );
        metrics.embedBytes += embeddedRaw.length;
        const scopedRaw = scopeEmbedMarkdown(embeddedRaw, target);
        return timeSilicaAsync(
          "vault-content.embed.render-html",
          {
            slug: currentSlug,
            embedSlug: resolved,
            embedDepth,
            bytes: scopedRaw.length,
          },
          () =>
            renderMarkdownHtml(
              scopedRaw,
              renderContext(resolved, embeddedEntry.sourcePath, embedDepth + 1),
            ),
        );
      }),
  });

  const raw = await timeSilicaAsync(
    "vault-content.read-source",
    { slug, file: entry.file },
    () => fs.readFile(entry.file, "utf8"),
  );
  const pageRenderContext = renderContext(slug, entry.sourcePath);
  const rendered = await timeSilicaAsync(
    "vault-content.render-markdown",
    { slug, bytes: raw.length },
    () => renderMarkdown(raw, pageRenderContext),
  );
  const breadcrumbs = timeSilica("vault-content.breadcrumbs", { slug }, () =>
    getBreadcrumbs(slug),
  );
  const backlinks = timeSilica("vault-content.backlinks", { slug }, () =>
    getBacklinks(slug),
  );
  const pageProperties = timeSilica(
    "vault-content.page-properties",
    { slug },
    () => getResolvedPageProperties(entry.frontmatter, pageRenderContext),
  );

  logSilicaTiming("vault-content.cache-miss.end", {
    slug,
    renderHash,
    renderEnvironmentHash,
    bytes: raw.length,
    durationMs: roundTimingMs(nowSilicaTimingMs() - startedAt),
    wikiLinkCount: metrics.wikiLinkCount,
    wikiLinkMs: roundTimingMs(metrics.wikiLinkMs),
    assetCount: metrics.assetCount,
    assetMs: roundTimingMs(metrics.assetMs),
    embedCount: metrics.embedCount,
    embedMs: roundTimingMs(metrics.embedMs),
    embedBytes: metrics.embedBytes,
    breadcrumbCount: breadcrumbs.length,
    backlinkCount: backlinks.length,
    tocCount: rendered.toc.length,
  });

  return (
    <theme.PageRenderer
      config={config}
      breadcrumbs={breadcrumbs}
      backlinks={backlinks}
      page={{
        slug,
        title: entry.title,
        description: entry.description,
        content: rendered.content,
        frontmatter: entry.frontmatter,
        pageProperties,
        toc: rendered.toc,
        tags: entry.tags,
        entry,
      }}
    />
  );
}

type VaultRenderMetric = "wikiLink" | "asset" | "embed";

type VaultRenderMetrics = {
  wikiLinkCount: number;
  wikiLinkMs: number;
  assetCount: number;
  assetMs: number;
  embedCount: number;
  embedMs: number;
  embedBytes: number;
};

function createVaultRenderMetrics(): VaultRenderMetrics {
  return {
    wikiLinkCount: 0,
    wikiLinkMs: 0,
    assetCount: 0,
    assetMs: 0,
    embedCount: 0,
    embedMs: 0,
    embedBytes: 0,
  };
}

function measureVaultRenderMetric<T>(
  metrics: VaultRenderMetrics,
  metric: VaultRenderMetric,
  callback: () => T,
): T {
  const startedAt = nowSilicaTimingMs();
  try {
    return callback();
  } finally {
    addVaultRenderMetric(metrics, metric, nowSilicaTimingMs() - startedAt);
  }
}

async function measureVaultRenderMetricAsync<T>(
  metrics: VaultRenderMetrics,
  metric: VaultRenderMetric,
  callback: () => Promise<T>,
): Promise<T> {
  const startedAt = nowSilicaTimingMs();
  try {
    return await callback();
  } finally {
    addVaultRenderMetric(metrics, metric, nowSilicaTimingMs() - startedAt);
  }
}

function addVaultRenderMetric(
  metrics: VaultRenderMetrics,
  metric: VaultRenderMetric,
  durationMs: number,
): void {
  if (metric === "wikiLink") {
    metrics.wikiLinkCount += 1;
    metrics.wikiLinkMs += durationMs;
    return;
  }
  if (metric === "asset") {
    metrics.assetCount += 1;
    metrics.assetMs += durationMs;
    return;
  }
  metrics.embedCount += 1;
  metrics.embedMs += durationMs;
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
