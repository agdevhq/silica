import { describe, expect, it } from "vitest";
import {
  asFullSlug,
  resolveWikiLink,
  simplifySlug,
  slugifyFilePath,
  slugToHref,
} from "./path.js";

describe("path helpers", () => {
  it("slugifies content file paths", () => {
    expect(slugifyFilePath("Notes/My First Note.md")).toBe(
      "notes/my-first-note",
    );
    expect(simplifySlug(asFullSlug("notes/index"))).toBe("notes");
    expect(slugToHref("index")).toBe("/");
  });

  it("can strip numeric ordering prefixes from slugs", () => {
    expect(
      slugifyFilePath("01_Getting Started/02_Install.md", "content", {
        numericPrefixes: true,
      }),
    ).toBe("getting-started/install");
  });

  it("resolves shortest wikilinks by basename", () => {
    const resolved = resolveWikiLink(
      "index",
      "Auth",
      ["index", "notes/auth"],
      "shortest",
    );
    expect(resolved).toBe("notes/auth");
  });
});
