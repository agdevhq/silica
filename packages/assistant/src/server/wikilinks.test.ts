import { describe, expect, it } from "vitest";
import type { AssistantCitation } from "../types.js";
import {
  AssistantWikiLinkFilter,
  resolveAssistantWikiLinks,
} from "./wikilinks.js";

const citations: Record<string, AssistantCitation> = {
  Frontmatter: {
    slug: "writing/frontmatter",
    title: "Frontmatter",
    href: "/writing/frontmatter",
    sourcePath: "writing/frontmatter.md",
  },
  "Writing/Frontmatter": {
    slug: "writing/frontmatter",
    title: "Frontmatter",
    href: "/writing/frontmatter",
    sourcePath: "writing/frontmatter.md",
  },
  "A|B": {
    slug: "escaped",
    title: "Escaped",
    href: "/escaped",
    sourcePath: "escaped.md",
  },
};

describe("resolveAssistantWikiLinks", () => {
  it("converts resolved wikilinks to markdown links", async () => {
    await expect(
      resolveAssistantWikiLinks(
        "Read [[Writing/Frontmatter|Frontmatter]].",
        (target) => citations[target],
      ),
    ).resolves.toBe("Read [Frontmatter](/writing/frontmatter).");
  });

  it("uses the target as the label when no label is provided", async () => {
    await expect(
      resolveAssistantWikiLinks(
        "Read [[Frontmatter]].",
        (target) => citations[target],
      ),
    ).resolves.toBe("Read [Frontmatter](/writing/frontmatter).");
  });

  it("renders unresolved wikilinks as plain labels", async () => {
    await expect(
      resolveAssistantWikiLinks(
        "Read [[Missing|Missing page]].",
        () => undefined,
      ),
    ).resolves.toBe("Read Missing page.");
  });

  it("handles escaped pipes in targets", async () => {
    await expect(
      resolveAssistantWikiLinks(
        "Read [[A\\|B|Escaped]].",
        (target) => citations[target],
      ),
    ).resolves.toBe("Read [Escaped](/escaped).");
  });

  it("buffers wikilinks split across chunks", async () => {
    const filter = new AssistantWikiLinkFilter((target) => citations[target]);

    await expect(filter.push("Read [[Front")).resolves.toBe("Read ");
    await expect(filter.push("matter]] now.")).resolves.toBe(
      "[Frontmatter](/writing/frontmatter) now.",
    );
    await expect(filter.flush()).resolves.toBe("");
  });

  it("does not convert wikilinks inside inline code", async () => {
    await expect(
      resolveAssistantWikiLinks(
        "Use `[[Frontmatter]]` syntax, then read [[Frontmatter]].",
        (target) => citations[target],
      ),
    ).resolves.toBe(
      "Use `[[Frontmatter]]` syntax, then read [Frontmatter](/writing/frontmatter).",
    );
  });

  it("does not convert wikilinks inside fenced code blocks", async () => {
    await expect(
      resolveAssistantWikiLinks(
        "Example:\n```\n[[Frontmatter]]\n```\nRead [[Frontmatter]].",
        (target) => citations[target],
      ),
    ).resolves.toBe(
      "Example:\n```\n[[Frontmatter]]\n```\nRead [Frontmatter](/writing/frontmatter).",
    );
  });
});
