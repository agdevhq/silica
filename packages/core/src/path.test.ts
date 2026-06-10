import { describe, expect, it } from "vitest";
import {
  asFullSlug,
  createAssetResolutionIndex,
  createWikiLinkResolutionIndex,
  normalizeAssetReference,
  normalizeSlug,
  numericPrefixSortKey,
  resolveAssetPath,
  resolveWikiLink,
  simplifySlug,
  slugifyAssetPath,
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
    expect(
      slugifyFilePath("001 Appendix/120. Reference.md", "content", {
        numericPrefixes: true,
      }),
    ).toBe("appendix/reference");
  });

  it("does not strip date-like numeric prefixes from slugs", () => {
    const options = { numericPrefixes: true };

    expect(
      slugifyFilePath(
        "journal/2026-04-10 Standup Notes.md",
        "content",
        options,
      ),
    ).toBe("journal/2026-04-10-standup-notes");
    expect(
      slugifyFilePath("journal/2026-04 Planning.md", "content", options),
    ).toBe("journal/2026-04-planning");
    expect(slugifyFilePath("journal/04-10 Notes.md", "content", options)).toBe(
      "journal/04-10-notes",
    );
  });

  it("does not strip non-sorting numeric prefixes from slugs", () => {
    const options = { numericPrefixes: true };

    expect(slugifyFilePath("notes/2026 Roadmap.md", "content", options)).toBe(
      "notes/2026-roadmap",
    );
    expect(
      slugifyFilePath("notes/404 Error Pages.md", "content", options),
    ).toBe("notes/404-error-pages");
  });

  it("resolves wikilinks to date-like numeric filenames", () => {
    const options = { numericPrefixes: true };
    const slug = slugifyFilePath(
      "content/journal/2026-04-10 Standup Notes.md",
      "content",
      options,
    );
    const index = createWikiLinkResolutionIndex([slug], options);

    expect(normalizeSlug("2026-04-10 Standup Notes", options)).toBe(
      "2026-04-10-standup-notes",
    );
    expect(
      resolveWikiLink(
        "journal/index",
        "2026-04-10 Standup Notes",
        index,
        "shortest",
        options,
      ),
    ).toBe("journal/2026-04-10-standup-notes");
  });

  it("strips sortable numeric prefixes only once when resolving wikilinks", () => {
    const options = { numericPrefixes: true };
    const slug = slugifyFilePath(
      "content/notes/01 02 Intro.md",
      "content",
      options,
    );
    const index = createWikiLinkResolutionIndex([slug], options);

    expect(slug).toBe("notes/02-intro");
    expect(
      resolveWikiLink("notes/index", "01 02 Intro", index, "shortest", options),
    ).toBe("notes/02-intro");
  });

  it("preserves dotted names in numeric prefix sort keys", () => {
    expect(numericPrefixSortKey("01. v1.2 Release Notes.md")).toBe(
      "0000000001:v1-2-release-notes",
    );
    expect(numericPrefixSortKey("01. Dr. Alice Example.md")).toBe(
      "0000000001:dr-alice-example",
    );
    expect(numericPrefixSortKey("001 Appendix.md")).toBe("0000000001:appendix");
    expect(numericPrefixSortKey("120. Reference.md")).toBe(
      "0000000120:reference",
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

  it("resolves asset references by path, relative path, and basename", () => {
    const options = { numericPrefixes: true };
    const index = createAssetResolutionIndex(
      [
        {
          sourcePath: "attachments/Pasted Image.png",
          assetPath: slugifyAssetPath("attachments/Pasted Image.png", options),
        },
        {
          sourcePath: "01 Notes/local.pdf",
          assetPath: slugifyAssetPath("01 Notes/local.pdf", options),
        },
      ],
      options,
    );

    expect(normalizeAssetReference("Pasted Image.png")).toBe(
      "pasted-image.png",
    );
    expect(
      resolveAssetPath(
        "notes/page",
        "attachments/Pasted Image.png",
        index,
        "shortest",
      ),
    ).toBe("attachments/pasted-image.png");
    expect(
      resolveAssetPath(
        "01 Notes/02 Page.md",
        "local.pdf",
        index,
        "relative",
        options,
      ),
    ).toBe("notes/local.pdf");
    expect(
      resolveAssetPath(
        "01 Notes/02 Page.md",
        "Pasted Image.png",
        index,
        "shortest",
      ),
    ).toBe("attachments/pasted-image.png");
  });

  it("slugifies asset paths without dropping extensions", () => {
    expect(
      slugifyAssetPath("01 Notes/Pasted Image.PNG", {
        numericPrefixes: true,
      }),
    ).toBe("notes/pasted-image.png");
  });

  it("does not resolve ambiguous shortest asset basenames", () => {
    const index = createAssetResolutionIndex([
      {
        sourcePath: "attachments/photo.png",
        assetPath: "attachments/photo.png",
      },
      {
        sourcePath: "images/photo.png",
        assetPath: "images/photo.png",
      },
    ]);

    expect(
      resolveAssetPath("index.md", "photo.png", index, "shortest"),
    ).toBeUndefined();
    expect(
      resolveAssetPath("index.md", "images/photo.png", index, "shortest"),
    ).toBe("images/photo.png");
  });
});
