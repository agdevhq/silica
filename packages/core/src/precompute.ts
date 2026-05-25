import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import { buildSearchIndex, type SearchRecord } from "@silicajs/search";
import { loadConfig } from "./config.js";
import { scanContent, type ContentMarkdownFile } from "./files.js";
import { asFullSlug, slugToHref } from "./path.js";
import { analyzeMarkdown } from "./pipeline/index.js";
import type { BrokenLink, Graph, Manifest, ManifestEntry, PrecomputeResult, ResolvedSilicaConfig } from "./types.js";

export type PrecomputeOptions = {
  projectRoot?: string;
  config?: ResolvedSilicaConfig;
};

export async function precompute(options: PrecomputeOptions = {}): Promise<PrecomputeResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const config = options.config ?? (await loadConfig(projectRoot));
  const scan = await scanContent(projectRoot, config);
  const markdownFiles = filterPublished(scan.markdown, config);
  const allSlugs = markdownFiles.map((file) => file.slug);
  const entries: ManifestEntry[] = [];
  const graphLinks: Record<string, string[]> = {};
  const brokenLinks: BrokenLink[] = [];
  const searchRecords: SearchRecord[] = [];

  await fs.ensureDir(path.join(projectRoot, ".silica"));
  await fs.ensureDir(path.join(projectRoot, ".silica/next/public/silica"));

  for (const file of markdownFiles) {
    const analysis = await analyzeMarkdown(file.raw, {
      slug: asFullSlug(file.slug),
      allSlugs,
      assetBaseUrl: "/silica",
      wikilinkStrategy: config.wikilinks.strategy,
    });

    const title = analysis.title ?? titleFromSlug(file.slug);
    const entry: ManifestEntry = {
      slug: file.slug,
      title,
      description: analysis.description,
      tags: analysis.tags,
      file: file.absolutePath,
      relativeFile: file.relativePath,
      created: stringifyDate(getDate(file.frontmatter.created) ?? getDate(file.frontmatter.date) ?? file.stats.birthtime),
      modified: stringifyDate(getDate(file.frontmatter.modified) ?? file.stats.mtime),
      frontmatter: file.frontmatter,
    };
    entries.push(entry);
    graphLinks[file.slug] = analysis.links;
    brokenLinks.push(...analysis.brokenLinks);
    searchRecords.push({
      id: file.slug,
      slug: file.slug,
      title,
      content: analysis.plainText,
      description: analysis.description,
      tags: analysis.tags,
    });
  }

  await copyAssets(projectRoot, config, scan.assets);

  const manifest = makeManifest(config, entries);
  const graph = makeGraph(graphLinks, brokenLinks);
  const buildId = crypto.randomUUID();
  const searchIndex = await buildSearchIndex(searchRecords);

  await writeJson(path.join(projectRoot, ".silica/manifest.json"), manifest);
  await writeJson(path.join(projectRoot, ".silica/graph.json"), graph);
  await writeJson(path.join(projectRoot, ".silica/config.json"), config);
  await writeJson(path.join(projectRoot, ".silica/search-index.json"), searchIndex);
  await fs.writeFile(path.join(projectRoot, ".silica/build-id.txt"), `${buildId}\n`);
  await writeSitemapAndRobots(projectRoot, config, manifest);

  if (config.wikilinks.strict && brokenLinks.length > 0) {
    const message = brokenLinks.map((link) => `${link.source} -> ${link.target}`).join("\n");
    throw new Error(`Broken wikilinks detected:\n${message}`);
  }

  return {
    manifest,
    graph,
    searchRecords,
    buildId,
    brokenLinks,
  };
}

function filterPublished(files: ContentMarkdownFile[], config: ResolvedSilicaConfig): ContentMarkdownFile[] {
  return files.filter((file) => {
    if (config.filters.removeDrafts && file.frontmatter.draft === true) return false;
    if (config.filters.explicitPublish && file.frontmatter.publish !== true) return false;
    return true;
  });
}

function makeManifest(config: ResolvedSilicaConfig, entries: ManifestEntry[]): Manifest {
  const sorted = entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    contentDir: config.contentDir,
    allSlugs: sorted.map((entry) => entry.slug),
    entries: sorted,
    bySlug: Object.fromEntries(sorted.map((entry) => [entry.slug, entry])),
  };
}

function makeGraph(links: Record<string, string[]>, brokenLinks: BrokenLink[]): Graph {
  const backlinks: Record<string, string[]> = {};
  for (const [source, targets] of Object.entries(links)) {
    links[source] = [...new Set(targets)].sort();
    for (const target of targets) {
      backlinks[target] ??= [];
      backlinks[target]!.push(source);
    }
  }

  for (const [target, sources] of Object.entries(backlinks)) {
    backlinks[target] = [...new Set(sources)].sort();
  }

  return {
    version: 1,
    links,
    backlinks,
    brokenLinks,
  };
}

async function copyAssets(
  projectRoot: string,
  config: ResolvedSilicaConfig,
  assets: Array<{ absolutePath: string; relativePath: string }>,
): Promise<void> {
  const destinationRoot = path.join(projectRoot, ".silica/next/public/silica");
  await fs.emptyDir(destinationRoot);
  for (const asset of assets) {
    await fs.ensureDir(path.dirname(path.join(destinationRoot, asset.relativePath)));
    await fs.copyFile(asset.absolutePath, path.join(destinationRoot, asset.relativePath));
  }

  await fs.ensureDir(path.join(projectRoot, ".silica/next/public"));
  await fs.writeFile(path.join(destinationRoot, ".gitkeep"), "");
}

async function writeSitemapAndRobots(projectRoot: string, config: ResolvedSilicaConfig, manifest: Manifest): Promise<void> {
  const publicRoot = path.join(projectRoot, ".silica/next/public");
  await fs.ensureDir(publicRoot);
  const baseUrl = (config.baseUrl ?? "http://localhost:3000").replace(/\/$/, "");
  const urls = manifest.entries.map((entry) => `  <url><loc>${baseUrl}${slugToHref(entry.slug)}</loc></url>`).join("\n");
  await fs.writeFile(
    path.join(publicRoot, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  await fs.writeFile(path.join(publicRoot, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, value, { spaces: 2 });
}

function getDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  return undefined;
}

function stringifyDate(value?: Date): string | undefined {
  return value?.toISOString();
}

function titleFromSlug(slug: string): string {
  const leaf = slug.split("/").at(-1) ?? slug;
  return leaf
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/^Index$/, "Home");
}
