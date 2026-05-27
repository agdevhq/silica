import { describe, expect, it } from "vitest";
import { parseTagQuery } from "./api-search.js";

describe("parseTagQuery", () => {
  it("extracts Obsidian-style tag filters from search queries", () => {
    expect(parseTagQuery("#project/active")).toEqual({
      query: "",
      tags: ["#project/active"],
    });
    expect(parseTagQuery("oauth tag:#security/auth")).toEqual({
      query: "oauth",
      tags: ["#security/auth"],
    });
  });
});
