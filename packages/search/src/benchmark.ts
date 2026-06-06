import { performance } from "node:perf_hooks";
import { loadSearchIndex } from "./load.js";
import { querySearchIndex } from "./query.js";
import type { SearchQueryOptions } from "./types.js";

export type SearchBenchmarkOptions = SearchQueryOptions & {
  query: string;
  warmRuns?: number;
};

export type SearchBenchmarkResult = {
  coldMs: number;
  warmMs: number;
  warmRuns: number;
  resultCount: number;
};

export async function benchmarkSearchIndex(
  databasePath: string,
  { query, warmRuns = 10, ...queryOptions }: SearchBenchmarkOptions,
): Promise<SearchBenchmarkResult> {
  const coldStart = performance.now();
  const loaded = await loadSearchIndex(databasePath);
  const coldResults = querySearchIndex(loaded, query, queryOptions);
  const coldMs = performance.now() - coldStart;

  const runs = Math.max(1, warmRuns);
  const warmStart = performance.now();
  for (let index = 0; index < runs; index += 1) {
    querySearchIndex(loaded, query, queryOptions);
  }
  const warmMs = (performance.now() - warmStart) / runs;

  try {
    return {
      coldMs: round(coldMs),
      warmMs: round(warmMs),
      warmRuns: runs,
      resultCount: coldResults.length,
    };
  } finally {
    loaded.close();
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
