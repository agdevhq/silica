import { describe, expect, it } from "vitest";
import type { AssistantSiteContext } from "../types.js";
import { resolveCitations, SourceTagFilter } from "./sources.js";

const site: AssistantSiteContext = {
  siteTitle: "Docs",
  pages: [
    {
      slug: "guides/install",
      title: "Install",
      sourcePath: "guides/install.md",
      file: "/project/.silica/content/guides/install.md",
    },
    {
      slug: "index",
      title: "Home",
      sourcePath: "index.md",
      file: "/project/.silica/content/index.md",
    },
  ],
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
  it("maps source paths to published pages", () => {
    expect(resolveCitations(site, ["guides/install.md"])).toEqual([
      {
        slug: "guides/install",
        title: "Install",
        href: "/guides/install",
        sourcePath: "guides/install.md",
      },
    ]);
  });

  it("normalizes mount prefixes and drops unknown or duplicate paths", () => {
    const citations = resolveCitations(site, [
      "/content/guides/install.md",
      "content/guides/install.md",
      "made-up.md",
    ]);
    expect(citations.map((citation) => citation.slug)).toEqual([
      "guides/install",
    ]);
  });
});
