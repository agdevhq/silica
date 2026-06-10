import crypto from "node:crypto";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Worker } from "node:worker_threads";
import fs from "fs-extra";
import { type SearchRecord } from "@silicajs/search";
import { loadConfig } from "./config.js";
import { scanContent, type ContentMarkdownFile } from "./files.js";
import {
  asFullSlug,
  createAssetResolutionIndex,
  createWikiLinkResolutionIndex,
  hasNumericPrefixInPath,
  numericPrefixSortKey,
  stripNumericPrefix,
  type AssetResolutionIndex,
  slugToHref,
  type WikiLinkResolutionIndex,
} from "./path.js";
import { getMenuLabel } from "./pipeline/frontmatter.js";
import { analyzeMarkdown } from "./pipeline/index.js";
import type {
  AnalyzeResult,
  BrokenLink,
  Graph,
  Manifest,
  ManifestEntry,
  PrecomputeResult,
  PrerenderManifest,
  RenderCacheState,
  ResolvedSilicaConfig,
} from "./types.js";
import { writeVaultDatabase } from "./vault-db.js";

const execFileAsync = promisify(execFile);
const MIN_PARALLEL_ANALYSIS_FILES = 64;
const ANALYSIS_BATCH_SIZE = 16;
const MAX_ANALYSIS_WORKERS = 12;
const RENDER_CACHE_SCHEMA_VERSION = "silica-render-v1";

export type PrecomputeOptions = {
  projectRoot?: string;
  config?: ResolvedSilicaConfig;
  analysisConcurrency?: number;
};

export async function precompute(
  options: PrecomputeOptions = {},
): Promise<PrecomputeResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const config = options.config ?? (await loadConfig(projectRoot));
  const scan = await scanContent(projectRoot, config);
  const markdownFiles = filterPublished(scan.markdown, config);
  const assetEntries = scan.assets.map(({ sourcePath, assetPath }) => ({
    sourcePath,
    assetPath,
  }));
  const allSlugs = markdownFiles.map((file) => file.slug);
  const wikilinkIndex = createWikiLinkResolutionIndex(
    allSlugs,
    config.ordering,
  );
  const assetIndex = createAssetResolutionIndex(assetEntries, config.ordering);
  const entries: ManifestEntry[] = [];
  const graphLinks: Record<string, string[]> = {};
  const brokenLinks: BrokenLink[] = [];
  const searchRecords: SearchRecord[] = [];
  const runtimeContentRoot = path.join(projectRoot, ".silica/content");
  const relativeGitPaths = markdownFiles.map((file) =>
    normalizeGitPath(path.join(config.contentDir, file.sourcePath)),
  );
  const gitDatesByPath = await getGitDatesForFiles(
    projectRoot,
    relativeGitPaths,
  );

  await fs.ensureDir(path.join(projectRoot, ".silica"));
  await fs.ensureDir(path.join(projectRoot, ".silica/next/public/silica"));
  await writeRuntimeMarkdown(runtimeContentRoot, markdownFiles);
  const analyses = await analyzeMarkdownFiles(markdownFiles, config, allSlugs, {
    concurrency: options.analysisConcurrency,
    wikilinkIndex,
    assetIndex,
    assetEntries,
  });

  for (const [index, file] of markdownFiles.entries()) {
    const gitDates =
      gitDatesByPath.get(
        normalizeGitPath(path.join(config.contentDir, file.sourcePath)),
      ) ?? {};
    const analysis = analyses[index]!;

    const title =
      analysis.title ?? titleFromFilePath(file.sourcePath, config.ordering);
    const menuLabel = getMenuLabel(file.frontmatter, title);
    const sortKey =
      config.ordering.numericPrefixes && hasNumericPrefixInPath(file.sourcePath)
        ? numericPrefixSortKey(file.sourcePath)
        : undefined;
    const entry: ManifestEntry = {
      slug: file.slug,
      title,
      menuLabel,
      description: analysis.description,
      generatedDescription: analysis.generatedDescription,
      tags: analysis.tags,
      file: normalizeGitPath(path.join(".silica/content", file.sourcePath)),
      sourcePath: file.sourcePath,
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
      contentHash: hashString(file.raw),
      embeds: analysis.embeds,
    };
    entries.push(entry);
    graphLinks[file.slug] = analysis.links;
    brokenLinks.push(...analysis.brokenLinks);
    if (isListedEntry(entry)) {
      searchRecords.push({
        id: file.slug,
        slug: file.slug,
        title,
        content: analysis.plainText,
        description: analysis.description,
        tags: analysis.tags,
      });
    }
  }

  await copyAssets(projectRoot, config, scan.assets);

  const manifest = makeManifest(config, entries);
  const graph = makeGraph(graphLinks, brokenLinks);
  const renderHashes = makeRenderHashes(manifest, graph);
  const cacheState = await makeRenderCacheState(projectRoot, config, manifest);
  const prerender = makePrerenderManifest(manifest, graph, config);
  await writeVaultDatabase(projectRoot, {
    config,
    manifest,
    graph,
    renderHashes,
    cacheState,
    prerender,
    searchRecords,
    assets: assetEntries,
  });
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
    prerender,
    cacheState,
    brokenLinks,
  };
}

type AnalyzeMarkdownFilesOptions = {
  concurrency?: number;
  wikilinkIndex: WikiLinkResolutionIndex;
  assetIndex: AssetResolutionIndex;
  assetEntries: Array<{ sourcePath: string; assetPath: string }>;
};

type AnalysisWorkerFile = {
  index: number;
  slug: string;
  sourcePath: string;
  raw: string;
};

type AnalysisWorkerMessage = {
  id: number;
  files: AnalysisWorkerFile[];
};

type AnalysisWorkerResult = {
  id: number;
  results?: Array<{ index: number; analysis: AnalyzeResult }>;
  error?: string;
};

async function analyzeMarkdownFiles(
  files: ContentMarkdownFile[],
  config: ResolvedSilicaConfig,
  allSlugs: string[],
  options: AnalyzeMarkdownFilesOptions,
): Promise<AnalyzeResult[]> {
  const workerCount = getAnalysisWorkerCount(files.length, options.concurrency);
  if (workerCount <= 1) {
    return analyzeMarkdownFilesSerial(
      files,
      config,
      options.wikilinkIndex,
      options.assetIndex,
    );
  }

  return analyzeMarkdownFilesParallel(
    files,
    config,
    allSlugs,
    options.assetEntries,
    workerCount,
  );
}

async function analyzeMarkdownFilesSerial(
  files: ContentMarkdownFile[],
  config: ResolvedSilicaConfig,
  wikilinkIndex: WikiLinkResolutionIndex,
  assetIndex: AssetResolutionIndex,
): Promise<AnalyzeResult[]> {
  const analyses: AnalyzeResult[] = [];
  for (const file of files) {
    analyses.push(
      await analyzeMarkdown(file.raw, {
        slug: asFullSlug(file.slug),
        sourcePath: file.sourcePath,
        wikilinkIndex,
        assetIndex,
        assetBaseUrl: "/silica",
        wikilinkStrategy: config.wikilinks.strategy,
        tags: config.tags,
        ordering: config.ordering,
      }),
    );
  }
  return analyses;
}

function analyzeMarkdownFilesParallel(
  files: ContentMarkdownFile[],
  config: ResolvedSilicaConfig,
  allSlugs: string[],
  assetEntries: Array<{ sourcePath: string; assetPath: string }>,
  workerCount: number,
): Promise<AnalyzeResult[]> {
  return new Promise((resolve, reject) => {
    const workerUrl = new URL("./precompute-worker.js", import.meta.url);
    const workers: Worker[] = [];
    const analyses: AnalyzeResult[] = new Array(files.length);
    let nextIndex = 0;
    let completed = 0;
    let settled = false;

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      for (const worker of workers) {
        void worker.terminate();
      }
      reject(error);
    };

    const resolveIfDone = () => {
      if (completed < files.length || settled) return;
      settled = true;
      for (const worker of workers) {
        void worker.terminate();
      }
      resolve(analyses);
    };

    const sendNext = (worker: Worker) => {
      if (settled || nextIndex >= files.length) return;
      const start = nextIndex;
      const batch = files
        .slice(start, start + ANALYSIS_BATCH_SIZE)
        .map((file, offset) => ({
          index: start + offset,
          slug: file.slug,
          sourcePath: file.sourcePath,
          raw: file.raw,
        }));
      nextIndex += batch.length;
      worker.postMessage({
        id: start,
        files: batch,
      } satisfies AnalysisWorkerMessage);
    };

    for (let index = 0; index < workerCount; index += 1) {
      const worker = new Worker(workerUrl, {
        workerData: {
          allSlugs,
          assetEntries,
          wikilinkStrategy: config.wikilinks.strategy,
          tags: config.tags,
          ordering: config.ordering,
        },
      });
      workers.push(worker);
      worker.on("message", (message: AnalysisWorkerResult) => {
        if (message.error) {
          rejectOnce(new Error(message.error));
          return;
        }
        for (const result of message.results ?? []) {
          analyses[result.index] = result.analysis;
        }
        completed += message.results?.length ?? 0;
        resolveIfDone();
        sendNext(worker);
      });
      worker.on("error", rejectOnce);
      worker.on("exit", (code) => {
        if (!settled && code !== 0) {
          rejectOnce(
            new Error(`Precompute analysis worker exited with ${code}`),
          );
        }
      });
      sendNext(worker);
    }
  });
}

function getAnalysisWorkerCount(
  fileCount: number,
  requestedConcurrency: number | undefined,
): number {
  if (fileCount === 0) return 1;
  if (
    requestedConcurrency === undefined &&
    fileCount < MIN_PARALLEL_ANALYSIS_FILES
  ) {
    return 1;
  }

  const available = Math.max(
    1,
    os.availableParallelism?.() ?? os.cpus().length,
  );
  const requested = getRequestedAnalysisConcurrency(
    requestedConcurrency,
    available,
  );
  const usefulWorkers = Math.ceil(fileCount / ANALYSIS_BATCH_SIZE);
  return Math.max(1, Math.min(fileCount, requested, usefulWorkers));
}

function getRequestedAnalysisConcurrency(
  requestedConcurrency: number | undefined,
  available: number,
): number {
  if (requestedConcurrency === undefined) {
    return Math.min(available, MAX_ANALYSIS_WORKERS);
  }
  if (!Number.isFinite(requestedConcurrency)) return 1;
  return Math.max(1, Math.floor(requestedConcurrency));
}

async function writeRuntimeMarkdown(
  runtimeContentRoot: string,
  files: ContentMarkdownFile[],
): Promise<void> {
  await fs.emptyDir(runtimeContentRoot);
  for (const file of files) {
    const destination = path.join(runtimeContentRoot, file.sourcePath);
    await fs.ensureDir(path.dirname(destination));
    await fs.writeFile(destination, file.raw);
  }
}

async function makeRenderCacheState(
  projectRoot: string,
  config: ResolvedSilicaConfig,
  manifest: Manifest,
): Promise<RenderCacheState> {
  const themeHash = await getThemeHash(projectRoot, config.theme);
  const configHash = hashStable({
    title: config.title,
    description: config.description,
    logo: config.logo,
    baseUrl: config.baseUrl,
    contentDir: config.contentDir,
    theme: config.theme,
    auth: config.auth,
    wikilinks: config.wikilinks,
    tags: config.tags,
    ordering: config.ordering,
    filters: config.filters,
  });
  const navigationHash = hashStable({
    entries: manifest.entries.filter(isListedEntry).map((entry) => ({
      slug: entry.slug,
      menuLabel: entry.menuLabel,
      sortKey: entry.sortKey,
    })),
  });
  const tagIndexHash = hashStable({
    entries: manifest.entries.filter(isListedEntry).map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      tags: entry.tags,
    })),
  });
  return {
    version: 1,
    renderEnvironmentHash: hashStable({
      version: RENDER_CACHE_SCHEMA_VERSION,
      configHash,
      themeHash,
    }),
    configHash,
    navigationHash,
    tagIndexHash,
    themeHash,
    rendererVersion: RENDER_CACHE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

function makeRenderHashes(
  manifest: Manifest,
  graph: Graph,
): Record<string, string> {
  const memo = new Map<string, string>();
  const renderHashForSlug = (
    slug: string,
    seen = new Set<string>(),
  ): string => {
    const cached = memo.get(slug);
    if (cached) return cached;
    const entry = manifest.bySlug[slug];
    if (!entry) return hashStable({ missing: slug });
    if (seen.has(slug)) {
      return hashStable({ slug, contentHash: entry.contentHash, cycle: true });
    }
    const nextSeen = new Set(seen).add(slug);
    const embedded = entry.embeds.map((target) => ({
      slug: target,
      renderHash: renderHashForSlug(target, nextSeen),
    }));
    const backlinks = (graph.backlinks[slug] ?? []).map((source) => ({
      slug: source,
      title: manifest.bySlug[source]?.title ?? source,
    }));
    const renderHash = hashStable({
      entry: {
        slug: entry.slug,
        title: entry.title,
        menuLabel: entry.menuLabel,
        description: entry.description,
        generatedDescription: entry.generatedDescription,
        tags: entry.tags,
        sourcePath: entry.sourcePath,
        sortKey: entry.sortKey,
        created: entry.created,
        modified: entry.modified,
        frontmatter: entry.frontmatter,
        contentHash: entry.contentHash,
      },
      embedded,
      backlinks,
    });
    memo.set(slug, renderHash);
    return renderHash;
  };

  for (const slug of manifest.allSlugs) {
    renderHashForSlug(slug);
  }
  return Object.fromEntries(memo);
}

function makePrerenderManifest(
  manifest: Manifest,
  graph: Graph,
  config: ResolvedSilicaConfig,
): PrerenderManifest {
  return {
    version: 1,
    slugs: selectPrerenderSlugs(manifest, graph, config),
  };
}

function selectPrerenderSlugs(
  manifest: Manifest,
  graph: Graph,
  config: ResolvedSilicaConfig,
): string[] {
  const prerender = config.render.prerender;
  const entries = manifest.entries;
  const scoreBySlug = new Map<string, number>();
  let candidates: ManifestEntry[] = [];

  if (prerender.strategy === "all") {
    candidates = entries;
  } else if (prerender.strategy === "depth") {
    candidates = entries.filter(
      (entry) =>
        entry.slug === "index" || getSlugDepth(entry.slug) <= prerender.depth,
    );
  } else if (prerender.strategy === "custom") {
    const context = { manifest, graph };
    candidates = entries.filter((entry) => {
      const selected = prerender.select?.(entry, context);
      if (typeof selected === "number" && Number.isFinite(selected)) {
        scoreBySlug.set(entry.slug, selected);
        return true;
      }
      return selected === true;
    });
  }

  const selected = new Set(
    [...candidates]
      .sort((left, right) => {
        const scoreDelta =
          (scoreBySlug.get(right.slug) ?? 0) -
          (scoreBySlug.get(left.slug) ?? 0);
        return scoreDelta || compareManifestEntries(left, right);
      })
      .slice(0, prerender.limit ?? candidates.length)
      .map((entry) => entry.slug),
  );

  for (const slug of prerender.include ?? []) {
    if (manifest.bySlug[slug]) selected.add(slug);
  }
  for (const slug of prerender.exclude ?? []) {
    selected.delete(slug);
  }

  return manifest.entries
    .map((entry) => entry.slug)
    .filter((slug) => selected.has(slug));
}

function getSlugDepth(slug: string): number {
  const segments = slug.split("/").filter(Boolean);
  return Math.max(0, segments.length - 1);
}

async function getThemeHash(
  projectRoot: string,
  theme: ResolvedSilicaConfig["theme"],
): Promise<string | undefined> {
  const themeName = getThemeName(theme);
  if (!themeName?.startsWith(".")) return undefined;
  const themeRoot = path.resolve(projectRoot, themeName);
  if (!(await fs.pathExists(themeRoot))) return undefined;
  const files = await readThemeFiles(themeRoot);
  return hashStable(files);
}

function getThemeName(
  theme: ResolvedSilicaConfig["theme"],
): string | undefined {
  if (typeof theme === "string") return theme;
  if (typeof theme === "object" && theme !== null) return theme.name;
  return undefined;
}

async function readThemeFiles(
  root: string,
  current = root,
): Promise<Array<{ path: string; content: string }>> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const results: Array<{ path: string; content: string }> = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await readThemeFiles(root, absolutePath)));
    } else if (entry.isFile()) {
      results.push({
        path: normalizeGitPath(path.relative(root, absolutePath)),
        content: await fs.readFile(absolutePath, "utf8"),
      });
    }
  }
  return results;
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

function hashString(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashStable(value: unknown): string {
  return hashString(stableStringify(value));
}

function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => typeof entryValue !== "function")
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
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
  assets: Array<{ absolutePath: string; assetPath: string }>,
): Promise<void> {
  const destinationRoot = path.join(projectRoot, ".silica/next/public/silica");
  await fs.emptyDir(destinationRoot);
  for (const asset of assets) {
    await fs.ensureDir(
      path.dirname(path.join(destinationRoot, asset.assetPath)),
    );
    await fs.copyFile(
      asset.absolutePath,
      path.join(destinationRoot, asset.assetPath),
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
    .filter(isListedEntry)
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

function getDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  return undefined;
}

export function isListedEntry(entry: ManifestEntry): boolean {
  return entry.frontmatter.listed !== false;
}

function stringifyDate(value?: Date): string | undefined {
  return value?.toISOString();
}

function titleFromFilePath(
  relativePath: string,
  ordering: ResolvedSilicaConfig["ordering"],
): string {
  const stem = path.posix
    .basename(normalizeGitPath(relativePath))
    .replace(/\.(md|markdown|mdx)$/i, "");
  const title = ordering.numericPrefixes ? stripNumericPrefix(stem) : stem;
  return /^index$/i.test(title) ? "Home" : title;
}
