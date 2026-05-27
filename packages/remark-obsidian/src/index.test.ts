import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import {
  extractInlineTags,
  getTags,
  remarkObsidian,
  tagMatches,
  tagToHref,
} from "./index.js";

type TestNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  children?: TestNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

async function run(markdown: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkObsidian, {
      inlineTags: true,
      resolveWikilink(target) {
        return target === "known" ? "known" : undefined;
      },
      slugToHref(slug) {
        return `/${slug}`;
      },
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

  it("builds nested tag URLs", () => {
    expect(tagToHref("Project/Active")).toBe("/tags/project/active");
  });

  it("turns inline tags into markdown links", async () => {
    const { tree } = await run("See #Project/Active and `#code`.");
    const paragraph = tree.children?.[0];
    const link = paragraph?.children?.[1];

    expect(link?.type).toBe("link");
    expect(link?.url).toBe("/tags/project/active");
    expect(link?.children?.[0]?.value).toBe("#Project/Active");
    expect(paragraph?.children?.[3]?.type).toBe("inlineCode");
  });

  it("turns wikilinks into markdown links and records resolved links", async () => {
    const { tree, data } = await run("See [[known|Known page]].");
    const paragraph = tree.children?.[0];
    const link = paragraph?.children?.[1];

    expect(link?.type).toBe("link");
    expect(link?.url).toBe("/known");
    expect(link?.children?.[0]?.value).toBe("Known page");
    expect(data.obsidianLinks).toEqual(["known"]);
  });

  it("leaves wikilinks inside code blocks alone", async () => {
    const { tree, data } = await run("```markdown\n[[known]]\n```\n");
    const code = tree.children?.[0];

    expect(code?.type).toBe("code");
    expect(code?.value).toBe("[[known]]");
    expect(data.obsidianLinks).toEqual([]);
    expect(data.obsidianBrokenLinks).toEqual([]);
  });

  it("marks unresolved wikilinks without injecting raw html", async () => {
    const { tree, data } = await run("[[missing|Missing page]]");
    const paragraph = tree.children?.[0];
    const brokenLink = paragraph?.children?.[0];

    expect(brokenLink?.type).toBe("silicaBrokenLink");
    expect(brokenLink?.data?.hName).toBe("span");
    expect(brokenLink?.data?.hProperties).toEqual({
      className: ["silica-broken-link"],
    });
    expect(brokenLink?.children?.[0]?.value).toBe("Missing page");
    expect(data.obsidianBrokenLinks).toEqual([{ target: "missing" }]);
  });
});
