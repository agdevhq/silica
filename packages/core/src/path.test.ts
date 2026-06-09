import { describe, expect, it } from "vitest";
import {
  asFullSlug,
  createWikiLinkResolutionIndex,
  numericPrefixSortKey,
  resolveWikiLink,
  simplifySlug,
  slugifyFilePath,
  slugifySegment,
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

  it("preserves dotted names after stripping document extensions", () => {
    expect(slugifyFilePath("notes/Dr. Alice Example.md")).toBe(
      "notes/dr-alice-example",
    );
    expect(slugifyFilePath("notes/Dr. Bob Example.md")).toBe(
      "notes/dr-bob-example",
    );
    expect(slugifyFilePath("notes/Acme Inc. Notes.md")).toBe(
      "notes/acme-inc-notes",
    );
    expect(slugifyFilePath("notes/v1.2 Release Notes.md")).toBe(
      "notes/v1-2-release-notes",
    );
  });

  it("slugifies path segments without treating dotted names as extensions", () => {
    expect(slugifySegment("Dr. Alice Example")).toBe("dr-alice-example");
    expect(slugifySegment("Acme Inc. Notes")).toBe("acme-inc-notes");
  });

  it("can strip numeric ordering prefixes from slugs", () => {
    expect(
      slugifyFilePath("01_Getting Started/02_Install.md", "content", {
        numericPrefixes: true,
      }),
    ).toBe("getting-started/install");
  });

  it("preserves dotted names in numeric prefix sort keys", () => {
    expect(numericPrefixSortKey("01. v1.2 Release Notes.md")).toBe(
      "0000000001:v1-2-release-notes",
    );
    expect(numericPrefixSortKey("01. Dr. Alice Example.md")).toBe(
      "0000000001:dr-alice-example",
    );
  });

  it("resolves shortest wikilinks by basename", () => {
    const resolved = resolveWikiLink(
      "index",
      "Auth",
      createWikiLinkResolutionIndex(["index", "notes/auth"]),
      "shortest",
    );
    expect(resolved).toBe("notes/auth");
  });

  it("does not resolve ambiguous shortest wikilink basenames", () => {
    const index = createWikiLinkResolutionIndex([
      "index",
      "notes/auth",
      "reference/auth",
    ]);

    expect(resolveWikiLink("index", "Auth", index, "shortest")).toBeUndefined();
    expect(resolveWikiLink("index", "notes/auth", index, "shortest")).toBe(
      "notes/auth",
    );
  });

  it("resolves wikilinks while ignoring heading and block fragments", () => {
    expect(
      resolveWikiLink(
        "index",
        "Notes/Auth#Install Guide",
        createWikiLinkResolutionIndex(["index", "notes/auth"]),
        "shortest",
      ),
    ).toBe("notes/auth");
    expect(
      resolveWikiLink(
        "index",
        "Notes/Auth#^intro",
        createWikiLinkResolutionIndex(["index", "notes/auth"]),
        "shortest",
      ),
    ).toBe("notes/auth");
  });
});
