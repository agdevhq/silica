export { benchmarkSearchIndex } from "./benchmark.js";
export {
  buildSearchIndex,
  createSearchDocument,
  DEFAULT_SEARCH_CONFIG,
} from "./build.js";
export { makeExcerpt, normalizeSearchText } from "./excerpt.js";
export {
  hydrateSearchIndex,
  loadSearchIndex,
  type LoadedSearchIndex,
} from "./load.js";
export { querySearchIndex } from "./query.js";
export type {
  SearchIndexConfig,
  SearchQueryOptions,
  SearchRecord,
  SearchResult,
  SerializedSearchIndex,
} from "./types.js";
export type {
  SearchBenchmarkOptions,
  SearchBenchmarkResult,
} from "./benchmark.js";
