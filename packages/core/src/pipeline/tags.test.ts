import { describe, expect, it } from "vitest";
import { transformObsidianMarkdown } from "./ofm.js";
import { extractInlineTags, getTags, tagMatches, tagToHref } from "./tags.js";

describe("Obsidian tags", () => {
  it("merges frontmatter tags with inline tags", () => {
    expect(
      getTags(
        {
          tags: ["Project/Active", "#home"],
        },
        [
          "# Inbox",
          "Discuss #Inbox/To-Read and #y1984.",
          "Ignore #1984 because pure numeric tags are invalid.",
        ].join("\n"),
      ),
    ).toEqual(["project/active", "home", "inbox/to-read", "y1984"]);
  });

  it("can disable inline tag recognition", () => {
    expect(
      getTags({ tags: ["Project/Active"] }, "Discuss #Inbox/To-Read.", {
        inline: false,
      }),
    ).toEqual(["project/active"]);
  });

  it("extracts inline tags outside code, comments, URLs, and link destinations", () => {
    expect(
      extractInlineTags(
        [
          "Keep #meeting and #Project/Active.",
          "Ignore `#code` and [heading](#overview).",
          "Ignore https://example.com/#fragment and %% #comment %%.",
          "```",
          "#fenced",
          "```",
        ].join("\n"),
      ),
    ).toEqual(["meeting", "project/active"]);
  });

  it("matches nested tags through their parents", () => {
    expect(tagMatches("project/active", "project")).toBe(true);
    expect(tagMatches("project/active", "#project/active")).toBe(true);
    expect(tagMatches("projectile", "project")).toBe(false);
  });

  it("builds nested tag URLs", () => {
    expect(tagToHref("Project/Active")).toBe("/tags/project/active");
  });

  it("linkifies inline tags during Obsidian markdown transformation", () => {
    expect(
      transformObsidianMarkdown("See #Project/Active and `#code`.", {
        slug: "index",
        allSlugs: [],
      }).markdown,
    ).toBe("See [#Project/Active](/tags/project/active) and `#code`.");
  });

  it("can disable inline tag linkification", () => {
    expect(
      transformObsidianMarkdown("See #Project/Active.", {
        slug: "index",
        allSlugs: [],
        tags: { inline: false },
      }).markdown,
    ).toBe("See #Project/Active.");
  });
});
