import { describe, expect, it } from "vitest";
import { formatBrokenWikilinks } from "./diagnostics.js";

describe("formatBrokenWikilinks", () => {
  it("formats stable broken wikilink diagnostics", () => {
    expect(
      formatBrokenWikilinks([
        { source: "index", target: "Missing" },
        { source: "notes/auth", target: "Other" },
      ]),
    ).toBe(
      [
        "[silica] broken wikilinks:",
        "  index -> Missing",
        "  notes/auth -> Other",
      ].join("\n"),
    );
  });
});
