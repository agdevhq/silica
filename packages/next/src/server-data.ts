import path from "node:path";
import fs from "fs-extra";
import { loadConfig, type Graph, type Manifest } from "@silicajs/core";

export function getProjectRoot(): string {
  return process.env.SILICA_PROJECT_ROOT ?? path.resolve(process.cwd(), "../..");
}

export function getSilicaRoot(): string {
  return path.join(getProjectRoot(), ".silica");
}

export async function loadManifest(): Promise<Manifest> {
  return fs.readJson(path.join(getSilicaRoot(), "manifest.json")) as Promise<Manifest>;
}

export async function loadGraph(): Promise<Graph> {
  return fs.readJson(path.join(getSilicaRoot(), "graph.json")) as Promise<Graph>;
}

export async function loadBuildId(): Promise<string> {
  return (await fs.readFile(path.join(getSilicaRoot(), "build-id.txt"), "utf8")).trim();
}

export async function loadResolvedConfig() {
  return loadConfig(getProjectRoot());
}

export function normalizeRouteSlug(slug?: string[]): string {
  return slug?.length ? slug.join("/") : "index";
}
