import { parentPort, workerData } from "node:worker_threads";
import {
  asFullSlug,
  createAssetResolutionIndex,
  createWikiLinkResolutionIndex,
} from "./path.js";
import { analyzeMarkdown } from "./pipeline/index.js";
import type { AnalyzeResult, ResolvedSilicaConfig } from "./types.js";

type WorkerData = {
  allSlugs: string[];
  assetEntries: Array<{ sourcePath: string; assetPath: string }>;
  wikilinkStrategy: ResolvedSilicaConfig["wikilinks"]["strategy"];
  tags: ResolvedSilicaConfig["tags"];
  ordering: ResolvedSilicaConfig["ordering"];
};

type AnalysisWorkerFile = {
  index: number;
  slug: string;
  sourcePath: string;
  raw: string;
};

type AnalysisWorkerMessage = {
  id: number;
  files: AnalysisWorkerFile[];
};

type AnalysisWorkerResult = {
  id: number;
  results?: Array<{ index: number; analysis: AnalyzeResult }>;
  error?: string;
};

const data = workerData as WorkerData;
const wikilinkIndex = createWikiLinkResolutionIndex(
  data.allSlugs,
  data.ordering,
);
const assetIndex = createAssetResolutionIndex(data.assetEntries, data.ordering);

parentPort?.on("message", async (message: AnalysisWorkerMessage) => {
  try {
    const results: NonNullable<AnalysisWorkerResult["results"]> = [];
    for (const file of message.files) {
      results.push({
        index: file.index,
        analysis: await analyzeMarkdown(file.raw, {
          slug: asFullSlug(file.slug),
          sourcePath: file.sourcePath,
          wikilinkIndex,
          assetIndex,
          assetBaseUrl: "/silica",
          wikilinkStrategy: data.wikilinkStrategy,
          tags: data.tags,
          ordering: data.ordering,
        }),
      });
    }
    parentPort?.postMessage({
      id: message.id,
      results,
    } satisfies AnalysisWorkerResult);
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      error:
        error instanceof Error ? error.stack || error.message : String(error),
    } satisfies AnalysisWorkerResult);
  }
});
