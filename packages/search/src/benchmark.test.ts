import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { benchmarkSearchIndex } from "./benchmark.js";
import { buildSearchDatabase } from "./build.js";

describe("search benchmark", () => {
  it("reports cold and warm latency for a SQLite search database", async () => {
    const databasePath = path.join(process.cwd(), ".tmp-search-benchmark.db");
    const records = Array.from({ length: 50 }, (_, index) => ({
      id: `note-${index}`,
      slug: `notes/${index}`,
      title: `Note ${index}`,
      content: `Silica benchmark note ${index} with repeated oauth markdown search content.`,
      tags: index % 2 === 0 ? ["even", "benchmark"] : ["odd", "benchmark"],
    }));
    await buildSearchDatabase(records, databasePath);

    try {
      const result = await benchmarkSearchIndex(databasePath, {
        query: "oauth",
        warmRuns: 5,
      });

      expect(result.resultCount).toBeGreaterThan(0);
      expect(result.coldMs).toBeGreaterThanOrEqual(0);
      expect(result.warmMs).toBeGreaterThanOrEqual(0);
      expect(result.warmRuns).toBe(5);
      console.log(
        `search-benchmark: cold=${result.coldMs}ms warm=${result.warmMs}ms results=${result.resultCount}`,
      );
    } finally {
      await fs.rm(databasePath, { force: true });
    }
  });
});
