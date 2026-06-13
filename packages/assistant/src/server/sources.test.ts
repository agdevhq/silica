import { describe, expect, it } from "vitest";
import type { AssistantCitation, AssistantSiteContext } from "../types.js";
import { resolveCitations, SourceTagFilter } from "./sources.js";

const citationsBySourcePath: Record<string, AssistantCitation> = {
  "guides/install.md": {
    slug: "guides/install",
    title: "Install",
    href: "/guides/install",
    sourcePath: "guides/install.md",
  },
  "index.md": {
    slug: "index",
    title: "Home",
    href: "/",
    sourcePath: "index.md",
  },
};

const site: AssistantSiteContext = {
  siteTitle: "Docs",
  contentRoot: "/project/.silica/content",
  resolveCitation: (sourcePath) => citationsBySourcePath[sourcePath],
};

describe("SourceTagFilter", () => {
  it("passes through text without a sources block", () => {
    const filter = new SourceTagFilter();
    expect(filter.push("Hello ") + filter.push("world")).toBe("Hello world");
    expect(filter.flush()).toEqual({ text: "", sources: [] });
  });

  it("withholds a sources block split across chunks", () => {
    const filter = new SourceTagFilter();
    const emitted = [
      filter.push("Answer."),
      filter.push("\n\n<sou"),
      filter.push("rces>\nguides/install.md\n</so"),
      filter.push("urces>"),
    ].join("");
    expect(emitted).toBe("Answer.");
    expect(filter.flush()).toEqual({
      text: "",
      sources: ["guides/install.md"],
    });
  });

  it("flushes withheld text that only resembled the tag", () => {
    const filter = new SourceTagFilter();
    const emitted = filter.push("a < b and a <s");
    expect(emitted).toBe("a < b and a");
    expect(filter.flush()).toEqual({ text: " <s", sources: [] });
  });

  it("parses bulleted source lines", () => {
    const filter = new SourceTagFilter();
    filter.push("<sources>\n- guides/install.md\n* index.md\n</sources>");
    expect(filter.flush().sources).toEqual(["guides/install.md", "index.md"]);
  });
});

describe("resolveCitations", () => {
  it("maps source paths to published pages", async () => {
    await expect(
      resolveCitations(site, ["guides/install.md"]),
    ).resolves.toEqual([
      {
        slug: "guides/install",
        title: "Install",
        href: "/guides/install",
        sourcePath: "guides/install.md",
      },
    ]);
  });

  it("normalizes mount prefixes and drops unknown or duplicate paths", async () => {
    const citations = await resolveCitations(site, [
      "/content/guides/install.md",
      "content/guides/install.md",
      "made-up.md",
    ]);
    expect(citations.map((citation) => citation.slug)).toEqual([
      "guides/install",
    ]);
  });
});
