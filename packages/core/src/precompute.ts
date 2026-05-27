import crypto from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import fs from "fs-extra";
import { buildSearchIndex, type SearchRecord } from "@silicajs/search";
import { loadConfig } from "./config.js";
import { scanContent, type ContentMarkdownFile } from "./files.js";
import {
  asFullSlug,
  hasNumericPrefixInPath,
  numericPrefixSortKey,
  slugToHref,
} from "./path.js";
import { getMenuLabel } from "./pipeline/frontmatter.js";
import { analyzeMarkdown } from "./pipeline/index.js";
import type {
  BrokenLink,
  Graph,
  Manifest,
  ManifestEntry,
  PrecomputeResult,
  ResolvedSilicaConfig,
} from "./types.js";

const execFileAsync = promisify(execFile);

export type PrecomputeOptions = {
  projectRoot?: string;
  config?: ResolvedSilicaConfig;
};

export async function precompute(
  options: PrecomputeOptions = {},
): Promise<PrecomputeResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const config = options.config ?? (await loadConfig(projectRoot));
  const scan = await scanContent(projectRoot, config);
  const markdownFiles = filterPublished(scan.markdown, config);
  const allSlugs = markdownFiles.map((file) => file.slug);
  const entries: ManifestEntry[] = [];
  const graphLinks: Record<string, string[]> = {};
  const brokenLinks: BrokenLink[] = [];
  const searchRecords: SearchRecord[] = [];
  const runtimeContentRoot = path.join(projectRoot, ".silica/content");
  const relativeGitPaths = markdownFiles.map((file) =>
    normalizeGitPath(path.join(config.contentDir, file.relativePath)),
  );
  const gitDatesByPath = await getGitDatesForFiles(
    projectRoot,
    relativeGitPaths,
  );

  await fs.ensureDir(path.join(projectRoot, ".silica"));
  await fs.ensureDir(path.join(projectRoot, ".silica/next/public/silica"));
  await writeRuntimeMarkdown(runtimeContentRoot, markdownFiles);

  for (const file of markdownFiles) {
    const gitDates =
      gitDatesByPath.get(
        normalizeGitPath(path.join(config.contentDir, file.relativePath)),
      ) ?? {};
    const analysis = await analyzeMarkdown(file.raw, {
      slug: asFullSlug(file.slug),
      allSlugs,
      assetBaseUrl: "/silica",
      wikilinkStrategy: config.wikilinks.strategy,
      tags: config.tags,
      ordering: config.ordering,
    });

    const title = analysis.title ?? titleFromSlug(file.slug);
    const menuLabel = getMenuLabel(file.frontmatter, title);
    const sortKey =
      config.ordering.numericPrefixes &&
      hasNumericPrefixInPath(file.relativePath)
        ? numericPrefixSortKey(file.relativePath)
        : undefined;
    const entry: ManifestEntry = {
      slug: file.slug,
      title,
      menuLabel,
      description: analysis.description,
      tags: analysis.tags,
      file: normalizeGitPath(path.join(".silica/content", file.relativePath)),
      relativeFile: file.relativePath,
      sortKey,
      created: stringifyDate(
        getDate(file.frontmatter.created) ??
          getDate(file.frontmatter.date) ??
          gitDates.created ??
          file.stats.birthtime,
      ),
      modified: stringifyDate(
        getDate(file.frontmatter.modified) ??
          gitDates.modified ??
          file.stats.mtime,
      ),
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

  await writeJson(
    path.join(projectRoot, ".silica/manifest.json"),
    serializeManifest(manifest),
  );
  await writeJson(path.join(projectRoot, ".silica/graph.json"), graph);
  await writeJson(path.join(projectRoot, ".silica/config.json"), config);
  await writeJson(
    path.join(projectRoot, ".silica/search-index.json"),
    searchIndex,
  );
  await fs.writeFile(
    path.join(projectRoot, ".silica/build-id.txt"),
    `${buildId}\n`,
  );
  await writeSitemapAndRobots(projectRoot, config, manifest);

  if (config.wikilinks.strict && brokenLinks.length > 0) {
    const message = brokenLinks
      .map((link) => `${link.source} -> ${link.target}`)
      .join("\n");
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

async function writeRuntimeMarkdown(
  runtimeContentRoot: string,
  files: ContentMarkdownFile[],
): Promise<void> {
  await fs.emptyDir(runtimeContentRoot);
  for (const file of files) {
    const destination = path.join(runtimeContentRoot, file.relativePath);
    await fs.ensureDir(path.dirname(destination));
    await fs.writeFile(destination, file.raw);
  }
}

function serializeManifest(
  manifest: Manifest,
): Omit<Manifest, "allSlugs" | "bySlug"> {
  return {
    version: manifest.version,
    generatedAt: manifest.generatedAt,
    contentDir: manifest.contentDir,
    entries: manifest.entries,
  };
}

export async function getGitDates(
  projectRoot: string,
  relativePath: string,
): Promise<{ created?: Date; modified?: Date }> {
  return (
    (
      await getGitDatesForFiles(projectRoot, [normalizeGitPath(relativePath)])
    ).get(normalizeGitPath(relativePath)) ?? {}
  );
}

async function getGitDatesForFiles(
  projectRoot: string,
  relativePaths: string[],
): Promise<Map<string, { created?: Date; modified?: Date }>> {
  const wanted = new Set(relativePaths.map(normalizeGitPath));
  const datesByPath = new Map<string, { created?: Date; modified?: Date }>();
  if (wanted.size === 0) return datesByPath;

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--format=__SILICA_COMMIT__%aI", "--name-only", "--", ...wanted],
      {
        cwd: projectRoot,
        timeout: 2_000,
      },
    );
    let commitDate: Date | undefined;
    for (const line of stdout.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("__SILICA_COMMIT__")) {
        const parsed = new Date(trimmed.slice("__SILICA_COMMIT__".length));
        commitDate = Number.isNaN(parsed.valueOf()) ? undefined : parsed;
        continue;
      }
      const relativePath = normalizeGitPath(trimmed);
      if (!commitDate || !wanted.has(relativePath)) continue;
      const dates = datesByPath.get(relativePath) ?? {};
      dates.modified ??= commitDate;
      dates.created = commitDate;
      datesByPath.set(relativePath, dates);
    }
  } catch {
    return datesByPath;
  }
  return datesByPath;
}

function normalizeGitPath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

function filterPublished(
  files: ContentMarkdownFile[],
  config: ResolvedSilicaConfig,
): ContentMarkdownFile[] {
  return files.filter((file) => {
    if (config.filters.removeDrafts && file.frontmatter.draft === true)
      return false;
    if (config.filters.explicitPublish && file.frontmatter.publish !== true)
      return false;
    return true;
  });
}

function makeManifest(
  config: ResolvedSilicaConfig,
  entries: ManifestEntry[],
): Manifest {
  const sorted = [...entries].sort(compareManifestEntries);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    contentDir: config.contentDir,
    allSlugs: sorted.map((entry) => entry.slug),
    entries: sorted,
    bySlug: Object.fromEntries(sorted.map((entry) => [entry.slug, entry])),
  };
}

function compareManifestEntries(a: ManifestEntry, b: ManifestEntry): number {
  if (a.sortKey || b.sortKey) {
    return (
      (a.sortKey ?? fallbackSortKey(a.slug)).localeCompare(
        b.sortKey ?? fallbackSortKey(b.slug),
      ) || a.slug.localeCompare(b.slug)
    );
  }

  return a.slug.localeCompare(b.slug);
}

function fallbackSortKey(slug: string): string {
  return slug
    .split("/")
    .map((segment) => `~~~~~~~~~~:${segment}`)
    .join("/");
}

function makeGraph(
  links: Record<string, string[]>,
  brokenLinks: BrokenLink[],
): Graph {
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
    await fs.ensureDir(
      path.dirname(path.join(destinationRoot, asset.relativePath)),
    );
    await fs.copyFile(
      asset.absolutePath,
      path.join(destinationRoot, asset.relativePath),
    );
  }

  await fs.ensureDir(path.join(projectRoot, ".silica/next/public"));
  await fs.writeFile(path.join(destinationRoot, ".gitkeep"), "");
}

async function writeSitemapAndRobots(
  projectRoot: string,
  config: ResolvedSilicaConfig,
  manifest: Manifest,
): Promise<void> {
  const publicRoot = path.join(projectRoot, ".silica/next/public");
  await fs.ensureDir(publicRoot);
  const baseUrl = (config.baseUrl ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const urls = manifest.entries
    .map(
      (entry) => `  <url><loc>${baseUrl}${slugToHref(entry.slug)}</loc></url>`,
    )
    .join("\n");
  if (!(await fs.pathExists(path.join(projectRoot, "public/sitemap.xml")))) {
    await fs.writeFile(
      path.join(publicRoot, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    );
  }
  if (!(await fs.pathExists(path.join(projectRoot, "public/robots.txt")))) {
    await fs.writeFile(
      path.join(publicRoot, "robots.txt"),
      `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`,
    );
  }
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
