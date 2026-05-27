import path from "node:path";
import fs from "fs-extra";
import type {
  Graph,
  Manifest,
  ResolvedSilicaConfig,
} from "@silicajs/core/runtime";

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

export function normalizeRouteSlug(slug?: string[]): string {
  return slug?.length ? slug.join("/") : "index";
}
