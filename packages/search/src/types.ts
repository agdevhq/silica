export type SearchRecord = {
  id: string;
  slug: string;
  title: string;
  content: string;
  description?: string;
  tags: string[];
};

export type StoredSearchRecord = Omit<SearchRecord, "content"> & {
  excerpt: string;
};

export type SerializedSearchIndex = {
  version: 1;
  config: SearchIndexConfig;
  records: StoredSearchRecord[];
  exported: Record<string, string>;
  builtAt: string;
};

export type SearchIndexConfig = {
  tokenize: "forward" | "full" | "reverse" | "strict";
  document: {
    id: "id";
    index: ["title", "content", "tags"];
    store: ["slug", "title", "description", "tags"];
  };
};

export type SearchResult = {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  excerpt: string;
  score: number;
};

export type SearchQueryOptions = {
  limit?: number;
  tags?: string[];
};
