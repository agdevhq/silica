import path from "node:path";
import fs from "fs-extra";
import type {
  Graph,
  Manifest,
  Navigation,
  ResolvedSilicaConfig,
  WikiLinkResolutionIndex,
} from "@silicajs/core/runtime";
import { createWikiLinkResolutionIndex } from "@silicajs/core/runtime";

export type PageRuntimeData = {
  buildId: string;
  manifest: Manifest;
  graph: Graph;
  config: ResolvedSilicaConfig;
  wikilinkIndex: WikiLinkResolutionIndex;
};

let pageRuntimeDataCache:
  | { cacheKey: string; promise: Promise<PageRuntimeData> }
  | undefined;

export function getProjectRoot(): string {
  const projectRoot = process.env.SILICA_PROJECT_ROOT;
  if (!projectRoot) {
    throw new Error("SILICA_PROJECT_ROOT must be set by the Silica CLI.");
  }

  return projectRoot;
}

export function getSilicaRoot(): string {
  return path.join(getProjectRoot(), ".silica");
}

export async function loadManifest(): Promise<Manifest> {
  const manifest = (await fs.readJson(
    path.join(getSilicaRoot(), "manifest.json"),
  )) as Omit<Manifest, "allSlugs" | "bySlug"> &
    Partial<Pick<Manifest, "allSlugs" | "bySlug">>;
  const entries = manifest.entries.map((entry) => ({
    ...entry,
    file: path.isAbsolute(entry.file)
      ? entry.file
      : path.join(getProjectRoot(), entry.file),
  }));
  return {
    ...manifest,
    entries,
    allSlugs: manifest.allSlugs ?? entries.map((entry) => entry.slug),
    bySlug:
      manifest.bySlug ??
      Object.fromEntries(entries.map((entry) => [entry.slug, entry])),
  };
}

export async function loadGraph(): Promise<Graph> {
  return fs.readJson(
    path.join(getSilicaRoot(), "graph.json"),
  ) as Promise<Graph>;
}

export async function loadNavigation(): Promise<Navigation> {
  return fs.readJson(
    path.join(getSilicaRoot(), "navigation.json"),
  ) as Promise<Navigation>;
}

export async function loadBuildId(): Promise<string> {
  return (
    await fs.readFile(path.join(getSilicaRoot(), "build-id.txt"), "utf8")
  ).trim();
}

export async function loadResolvedConfig() {
  return fs.readJson(
    path.join(getSilicaRoot(), "config.json"),
  ) as Promise<ResolvedSilicaConfig>;
}

export async function loadPageRuntimeData(): Promise<PageRuntimeData> {
  const buildId = await loadBuildId();
  const cacheKey = `${getProjectRoot()}:${buildId}`;
  if (pageRuntimeDataCache?.cacheKey === cacheKey) {
    return pageRuntimeDataCache.promise;
  }

  const promise = Promise.all([
    loadManifest(),
    loadGraph(),
    loadResolvedConfig(),
  ]).then(([manifest, graph, config]) => ({
    buildId,
    manifest,
    graph,
    config,
    wikilinkIndex: createWikiLinkResolutionIndex(
      manifest.allSlugs,
      config.ordering,
    ),
  }));

  pageRuntimeDataCache = { cacheKey, promise };
  promise.catch(() => {
    if (pageRuntimeDataCache?.cacheKey === cacheKey) {
      pageRuntimeDataCache = undefined;
    }
  });
  return promise;
}

export function normalizeRouteSlug(slug?: string[]): string {
  return slug?.length ? slug.join("/") : "index";
}
