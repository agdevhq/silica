import path from "node:path";
import fs from "fs-extra";
import type {
  Graph,
  Manifest,
  Navigation,
  PrerenderManifest,
  RenderCacheState,
  RouteCacheKeyManifest,
  ResolvedSilicaConfig,
  WikiLinkResolutionIndex,
} from "@silicajs/core/runtime";
import { createWikiLinkResolutionIndex } from "@silicajs/core/runtime";

export type PageRuntimeData = {
  cacheState: RenderCacheState;
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

export async function loadRenderCacheState(): Promise<RenderCacheState> {
  return fs.readJson(
    path.join(getSilicaRoot(), "cache-state.json"),
  ) as Promise<RenderCacheState>;
}

export async function loadPrerenderManifest(): Promise<PrerenderManifest> {
  return fs.readJson(
    path.join(getSilicaRoot(), "prerender.json"),
  ) as Promise<PrerenderManifest>;
}

export function loadRenderKey(slug: string): {
  renderHash: string;
  renderEnvironmentHash: string;
} {
  const keys = fs.readJsonSync(
    path.join(getSilicaRoot(), "route-cache-keys.json"),
  ) as RouteCacheKeyManifest;
  return {
    renderHash: keys.entries[slug]?.renderHash ?? "missing",
    renderEnvironmentHash: keys.renderEnvironmentHash,
  };
}

export function loadRenderEnvironmentHash(): string {
  const cacheState = fs.readJsonSync(
    path.join(getSilicaRoot(), "cache-state.json"),
  ) as RenderCacheState;
  return cacheState.renderEnvironmentHash;
}

export async function loadResolvedConfig() {
  return fs.readJson(
    path.join(getSilicaRoot(), "config.json"),
  ) as Promise<ResolvedSilicaConfig>;
}

export async function loadPageRuntimeData(): Promise<PageRuntimeData> {
  const cacheState = await loadRenderCacheState();
  const cacheKey = `${getProjectRoot()}:${cacheState.renderEnvironmentHash}:${cacheState.generatedAt}`;
  if (pageRuntimeDataCache?.cacheKey === cacheKey) {
    return pageRuntimeDataCache.promise;
  }

  const promise = Promise.all([
    loadManifest(),
    loadGraph(),
    loadResolvedConfig(),
  ]).then(([manifest, graph, config]) => ({
    cacheState,
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
