import { readFile } from "node:fs/promises";
import { createSearchDocument } from "./build.js";
import type { SerializedSearchIndex } from "./types.js";

export type LoadedSearchIndex = {
  document: ReturnType<typeof createSearchDocument>;
  artifact: SerializedSearchIndex;
};

const globalCache = globalThis as typeof globalThis & {
  __silicaSearchIndexes?: Map<string, LoadedSearchIndex>;
};

export async function hydrateSearchIndex(artifact: SerializedSearchIndex): Promise<LoadedSearchIndex> {
  const document = createSearchDocument(artifact.config);

  for (const [key, data] of Object.entries(artifact.exported)) {
    document.import(key, data);
  }

  return { document, artifact };
}

export async function loadSearchIndex(artifactPath: string): Promise<LoadedSearchIndex> {
  const cache = (globalCache.__silicaSearchIndexes ??= new Map());
  const cached = cache.get(artifactPath);
  if (cached) return cached;

  const raw = await readFile(artifactPath, "utf8");
  const artifact = JSON.parse(raw) as SerializedSearchIndex;
  const loaded = await hydrateSearchIndex(artifact);
  cache.set(artifactPath, loaded);
  return loaded;
}
