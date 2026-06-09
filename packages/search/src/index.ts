export { benchmarkSearchIndex } from "./benchmark.js";
export {
  buildSearchDatabase,
  buildSearchTables,
  SEARCH_DATABASE_FILENAME,
} from "./build.js";
export { makeExcerpt, normalizeSearchText } from "./excerpt.js";
export { loadSearchIndex, type LoadedSearchIndex } from "./load.js";
export { querySearchIndex } from "./query.js";
export type {
  SearchDatabaseMetadata,
  SearchQueryOptions,
  SearchRecord,
  SearchResult,
} from "./types.js";
export type {
  SearchBenchmarkOptions,
  SearchBenchmarkResult,
} from "./benchmark.js";
