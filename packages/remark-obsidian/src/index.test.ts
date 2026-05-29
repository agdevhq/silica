import { describe, expect, it } from "vitest";
import { unified } from "unified";
import type { Position } from "unist";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import {
  extractInlineTags,
  getTags,
  type RemarkObsidianOptions,
  remarkObsidian,
  tagMatches,
} from "./index.js";

type TestNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  target?: string;
  rawTarget?: string;
  linkTarget?: {
    path: string;
    heading?: string;
    blockId?: string;
    params?: Record<string, string>;
  };
  alias?: string;
  embedSize?: {
    width: number;
    height?: number;
  };
  tag?: string;
  raw?: string;
  id?: string;
  kind?: string;
  title?: string;
  fold?: "open" | "closed";
  data?: Record<string, unknown>;
  position?: Position;
  children?: TestNode[];
};

async function run(markdown: string, options: RemarkObsidianOptions = {}) {
  const processor = unified().use(remarkParse).use(remarkObsidian, options);
  const tree = processor.parse(markdown) as TestNode;
  const file = { data: {} };
  await processor.run(tree, file);
  return { tree, data: file.data as Record<string, unknown> };
}

describe("remarkObsidian", () => {
  it("works without options", async () => {
    const { tree } = await run("[[page]]");
    const paragraph = tree.children?.[0];
    const wikilink = paragraph?.children?.[0];

    expect(wikilink?.type).toBe("obsidianWikilink");
    expect(wikilink?.target).toBe("page");
  });

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

  it("treats an escaped pipe as the alias separator (for tables)", async () => {
    const { tree } = await run("See [[known\\|Known page]].");
    const paragraph = tree.children?.[0];
    const wikilink = paragraph?.children?.[1];

    expect(wikilink?.type).toBe("obsidianWikilink");
    expect(wikilink?.target).toBe("known");
    expect(wikilink?.alias).toBe("Known page");
    expect(wikilink?.children?.[0]?.value).toBe("Known page");
  });

  it("treats an escaped pipe as the embed size separator", async () => {
    const { tree } = await run("![[images/photo.png\\|120]]");
    const paragraph = tree.children?.[0];
    const embed = paragraph?.children?.[0];

    expect(embed?.type).toBe("obsidianWikiEmbed");
    expect(embed?.target).toBe("images/photo.png");
    expect(embed?.embedSize).toEqual({ width: 120 });
  });

  it("preserves wikilink heading and block fragments", async () => {
    const { tree } = await run(
      "[[Guide#Install|Install]] and [[Guide#^intro|Intro block]]",
    );
    const paragraph = tree.children?.[0];
    const headingLink = paragraph?.children?.[0];
    const blockLink = paragraph?.children?.[2];

    expect(headingLink?.linkTarget?.path).toBe("Guide");
    expect(headingLink?.linkTarget?.heading).toBe("Install");
    expect(blockLink?.linkTarget?.path).toBe("Guide");
    expect(blockLink?.linkTarget?.blockId).toBe("intro");
  });

  it("turns wiki embeds into neutral Obsidian embed nodes", async () => {
    const { tree } = await run("![[images/photo.png|Photo]]");
    const paragraph = tree.children?.[0];
    const embed = paragraph?.children?.[0];

    expect(embed?.type).toBe("obsidianWikiEmbed");
    expect(embed?.target).toBe("images/photo.png");
    expect(embed?.alias).toBe("Photo");
    expect(embed?.children?.[0]?.value).toBe("Photo");
  });

  it("parses embed sizes and PDF fragment params", async () => {
    const { tree } = await run(
      "![[images/photo.png|100x145]] ![[Doc.pdf#page=3]]",
    );
    const paragraph = tree.children?.[0];
    const imageEmbed = paragraph?.children?.[0];
    const pdfEmbed = paragraph?.children?.[2];

    expect(imageEmbed?.embedSize).toEqual({ width: 100, height: 145 });
    expect(pdfEmbed?.linkTarget?.path).toBe("Doc.pdf");
    expect(pdfEmbed?.linkTarget?.params).toEqual({ page: "3" });
  });

  it("stores dimensions from standard Markdown image alt text", async () => {
    const { tree } = await run(
      "![Engelbart|100x145](https://example.com/e.jpg)",
    );
    const paragraph = tree.children?.[0];
    const image = paragraph?.children?.[0];

    expect(image?.type).toBe("image");
    expect(image?.alt).toBe("Engelbart");
    expect(image?.data?.obsidianEmbedSize).toEqual({
      width: 100,
      height: 145,
    });
  });

  it("turns highlights into neutral Obsidian highlight nodes with positions", async () => {
    const { tree } = await run(
      "Use ==**marked** [text](https://example.com)==.",
    );
    const paragraph = tree.children?.[0];
    const highlight = paragraph?.children?.[1];

    expect(highlight?.type).toBe("obsidianHighlight");
    expect(highlight?.children?.[0]?.type).toBe("strong");
    expect(highlight?.children?.[0]?.children?.[0]?.value).toBe("marked");
    expect(highlight?.children?.[2]?.type).toBe("link");
    expect(highlight?.children?.[2]?.url).toBe("https://example.com");
    expect(highlight?.position).toBeTruthy();
  });

  it("turns callouts into neutral Obsidian callout nodes", async () => {
    const { tree } = await run("> [!warning]+ Heads up\n> Body.");
    const callout = tree.children?.[0];

    expect(callout?.type).toBe("obsidianCallout");
    expect(callout?.kind).toBe("warning");
    expect(callout?.title).toBe("Heads up");
    expect(callout?.fold).toBe("open");
    expect(callout?.children?.[0]?.type).toBe("paragraph");
    expect(callout?.children?.[0]?.children?.[0]?.value).toBe("Body.");
  });

  it("leaves ordinary blockquotes as blockquotes", async () => {
    const { tree } = await run("> Just quoted text.");
    const blockquote = tree.children?.[0];

    expect(blockquote?.type).toBe("blockquote");
    expect(blockquote?.children?.[0]?.children?.[0]?.value).toBe(
      "Just quoted text.",
    );
  });

  it("turns comments, block IDs, and inline footnotes into neutral nodes", async () => {
    const { tree } = await run("Text %%secret%% ^block-id ^[Inline note].");
    const paragraph = tree.children?.[0];

    expect(paragraph?.children?.[1]?.type).toBe("obsidianComment");
    expect(paragraph?.children?.[1]?.value).toBe("secret");
    expect(paragraph?.children?.[3]?.type).toBe("obsidianBlockId");
    expect(paragraph?.children?.[3]?.id).toBe("block-id");
    expect(paragraph?.children?.[5]?.type).toBe("obsidianInlineFootnote");
    expect(paragraph?.children?.[5]?.value).toBe("Inline note");
  });

  it("keeps bracketed markdown inside inline footnotes", async () => {
    const { tree } = await run(
      "Text ^[See [docs](https://example.com) and escaped \\] bracket].",
    );
    const paragraph = tree.children?.[0];
    const footnote = paragraph?.children?.[1];

    expect(footnote?.type).toBe("obsidianInlineFootnote");
    expect(footnote?.value).toBe(
      "See [docs](https://example.com) and escaped \\] bracket",
    );
    expect(footnote?.children?.[0]?.value).toBe("See ");
    expect(footnote?.children?.[1]?.type).toBe("link");
    expect(footnote?.children?.[1]?.url).toBe("https://example.com");
    expect(footnote?.children?.[1]?.children?.[0]?.value).toBe("docs");
  });

  it("leaves wikilinks inside code blocks alone", async () => {
    const { tree, data } = await run("```markdown\n[[known]]\n```\n");
    const code = tree.children?.[0];

    expect(code?.type).toBe("code");
    expect(code?.value).toBe("[[known]]");
    expect(data).toEqual({});
  });

  it("leaves existing Markdown links untouched", async () => {
    const { tree } = await run(
      "[[known]] [link](#target) https://x.test/#hash",
    );
    const paragraph = tree.children?.[0];

    expect(paragraph?.children?.[0]?.type).toBe("obsidianWikilink");
    expect(paragraph?.children?.[2]?.type).toBe("link");
    expect(paragraph?.children?.[3]?.value).toContain("https://x.test/#hash");
  });

  it("can disable inline tag nodes", async () => {
    const { tree } = await run("See #Project/Active.", { inlineTags: false });
    const paragraph = tree.children?.[0];

    expect(paragraph?.children?.[0]?.value).toBe("See #Project/Active.");
  });

  it("leaves invalid inline tag candidates as text", async () => {
    const { tree } = await run("Ignore #1984 but keep #y1984.");
    const paragraph = tree.children?.[0];

    expect(paragraph?.children?.[0]?.value).toBe("Ignore #1984 but keep ");
    expect(paragraph?.children?.[1]?.type).toBe("obsidianTag");
    expect(paragraph?.children?.[1]?.tag).toBe("y1984");
    expect(paragraph?.children?.[2]?.value).toBe(".");
  });

  it("leaves malformed Obsidian syntax as text", async () => {
    const cases = [
      "^[unterminated",
      "^[]",
      "[[unterminated",
      "![[unterminated",
      "%%unterminated",
      "==unterminated",
    ];

    for (const markdown of cases) {
      const { tree } = await run(markdown);
      const paragraph = tree.children?.[0];

      expect(paragraph?.children?.[0]?.type).toBe("text");
      expect(paragraph?.children?.[0]?.value).toBe(markdown);
    }
  });

  it("serializes custom nodes back to Obsidian syntax", async () => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkObsidian)
      .use(remarkStringify);
    const result = String(
      await processor.process(
        "[[known|Known]] and ==marked== #tag %%comment%% ^block ^[note]",
      ),
    );

    expect(result.trim()).toBe(
      "[[known|Known]] and ==marked== #tag %%comment%% ^block ^[note]",
    );
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
