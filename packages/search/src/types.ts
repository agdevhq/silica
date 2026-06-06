export type SearchRecord = {
  id: string;
  slug: string;
  title: string;
  content: string;
  description?: string;
  tags: string[];
};

export type SearchDatabaseMetadata = {
  version: 1;
  databasePath: string;
  recordCount: number;
  builtAt: string;
};

export type SearchHighlightPart = {
  text: string;
  highlighted: boolean;
};

export type SearchResult = {
  slug: string;
  title: string;
  titleParts: SearchHighlightPart[];
  description?: string;
  tags: string[];
  excerptParts: SearchHighlightPart[];
  score: number;
};

export type SearchQueryOptions = {
  limit?: number;
  tags?: string[];
};
