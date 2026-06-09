import { describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";

describe("resolveConfig", () => {
  it("defaults render settings for static-first standalone output", () => {
    expect(resolveConfig().render).toEqual({
      prerender: { strategy: "all" },
      cache: { storage: "filesystem" },
    });
  });

  it("normalizes depth prerender shorthand", () => {
    expect(
      resolveConfig({
        render: {
          prerender: { depth: 2, include: ["index"], limit: 10 },
          cache: { storage: "memory" },
        },
      }).render,
    ).toEqual({
      prerender: {
        strategy: "depth",
        depth: 2,
        include: ["index"],
        limit: 10,
      },
      cache: { storage: "memory" },
    });
  });
});
