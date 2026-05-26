import { describe, expect, it } from "vitest";
import { benchmarkSearchIndex } from "./benchmark.js";
import { buildSearchIndex } from "./build.js";

describe("search benchmark", () => {
  it("reports cold and warm latency for a serialized index", async () => {
    const records = Array.from({ length: 50 }, (_, index) => ({
      id: `note-${index}`,
      slug: `notes/${index}`,
      title: `Note ${index}`,
      content: `Silica benchmark note ${index} with repeated oauth markdown search content.`,
      tags: index % 2 === 0 ? ["even", "benchmark"] : ["odd", "benchmark"],
    }));
    const artifact = await buildSearchIndex(records);

    const result = await benchmarkSearchIndex(artifact, {
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
  });
});
