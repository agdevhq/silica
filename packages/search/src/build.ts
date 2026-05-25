import { Document } from "flexsearch";
import type { SearchIndexConfig, SearchRecord, SerializedSearchIndex } from "./types.js";

export const DEFAULT_SEARCH_CONFIG: SearchIndexConfig = {
  tokenize: "forward",
  document: {
    id: "id",
    index: ["title", "content", "tags"],
    store: ["slug", "title", "description", "tags"],
  },
};

export function createSearchDocument(config: SearchIndexConfig = DEFAULT_SEARCH_CONFIG): Document {
  return new Document(config as unknown as ConstructorParameters<typeof Document>[0]);
}

export async function buildSearchIndex(records: SearchRecord[]): Promise<SerializedSearchIndex> {
  const index = createSearchDocument();

  for (const record of records) {
    index.add({
      ...record,
      tags: record.tags.join(" "),
    });
  }

  const exported: Record<string, string> = {};
  await index.export((key, data) => {
    if (typeof data === "string") exported[key] = data;
  });

  return {
    version: 1,
    config: DEFAULT_SEARCH_CONFIG,
    records,
    exported,
    builtAt: new Date().toISOString(),
  };
}
