import fs from "node:fs/promises";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@silicajs/core/runtime";
import {
  loadBuildId,
  loadGraph,
  loadManifest,
  loadResolvedConfig,
  normalizeRouteSlug,
} from "../server-data.js";
import type { SilicaTheme } from "../theme.js";

export async function generateStaticParams() {
  const manifest = await getPageManifest();
  return manifest.entries.map((entry) => ({
    slug: entry.slug === "index" ? [] : entry.slug.split("/"),
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = normalizeRouteSlug(resolvedParams?.slug);
  const manifest = await getPageManifest();
  const entry = manifest.bySlug[slug];
  if (!entry) return {};
  return {
    title: entry.title,
    description: entry.description,
  };
}

async function getPageManifest() {
  "use cache";
  cacheLife("max");
  return loadManifest();
}

export type PageProps = {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
};

export async function VaultContent({
  slug,
  theme,
}: {
  slug: string;
  theme: SilicaTheme;
}) {
  "use cache";
  cacheLife("max");
  const buildId = await loadBuildId();
  cacheTag("build", `build:${buildId}`, `page:${slug}`);

  const [manifest, graph, config] = await Promise.all([
    loadManifest(),
    loadGraph(),
    loadResolvedConfig(),
  ]);
  const entry = manifest.bySlug[slug];
  if (!entry) notFound();

  const raw = await fs.readFile(entry.file, "utf8");
  const rendered = await renderMarkdown(raw, {
    slug,
    allSlugs: manifest.allSlugs,
    assetBaseUrl: "/silica",
    wikilinkStrategy: config.wikilinks.strategy,
  });

  return (
    <theme.PageRenderer
      config={config}
      graph={graph}
      manifest={manifest}
      page={{
        slug,
        title: rendered.title ?? entry.title,
        description: rendered.description ?? entry.description,
        content: rendered.content,
        frontmatter: rendered.frontmatter,
        toc: rendered.toc,
        entry,
      }}
    />
  );
}
