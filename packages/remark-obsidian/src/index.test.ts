import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import {
  extractInlineTags,
  getTags,
  remarkObsidian,
  tagMatches,
} from "./index.js";

type TestNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  target?: string;
  alias?: string;
  tag?: string;
  raw?: string;
  children?: TestNode[];
};

async function run(markdown: string) {
  const processor = unified().use(remarkParse).use(remarkObsidian, {
    inlineTags: true,
  });
  const tree = processor.parse(markdown) as TestNode;
  const file = { data: {} };
  await processor.run(tree, file);
  return { tree, data: file.data as Record<string, unknown> };
}

describe("remarkObsidian", () => {
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

  it("turns inline tags into neutral Obsidian tag nodes", async () => {
    const { tree } = await run("See #Project/Active and `#code`.");
    const paragraph = tree.children?.[0];
    const tag = paragraph?.children?.[1];

    expect(tag?.type).toBe("obsidianTag");
    expect(tag?.tag).toBe("project/active");
    expect(tag?.raw).toBe("#Project/Active");
    expect(tag?.children?.[0]?.value).toBe("#Project/Active");
    expect(paragraph?.children?.[3]?.type).toBe("inlineCode");
  });

  it("turns wikilinks into neutral Obsidian wikilink nodes", async () => {
    const { tree, data } = await run("See [[known|Known page]].");
    const paragraph = tree.children?.[0];
    const wikilink = paragraph?.children?.[1];

    expect(wikilink?.type).toBe("obsidianWikilink");
    expect(wikilink?.target).toBe("known");
    expect(wikilink?.alias).toBe("Known page");
    expect(wikilink?.children?.[0]?.value).toBe("Known page");
    expect(data).toEqual({});
  });

  it("leaves wikilinks inside code blocks alone", async () => {
    const { tree, data } = await run("```markdown\n[[known]]\n```\n");
    const code = tree.children?.[0];

    expect(code?.type).toBe("code");
    expect(code?.value).toBe("[[known]]");
    expect(data).toEqual({});
  });

  it("does not resolve or render broken wikilinks", async () => {
    const { tree, data } = await run("[[missing|Missing page]]");
    const paragraph = tree.children?.[0];
    const wikilink = paragraph?.children?.[0];

    expect(wikilink?.type).toBe("obsidianWikilink");
    expect(wikilink?.target).toBe("missing");
    expect(wikilink?.alias).toBe("Missing page");
    expect(wikilink?.children?.[0]?.value).toBe("Missing page");
    expect(data).toEqual({});
  });
});
