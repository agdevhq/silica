import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  analyzeMarkdown,
  getTitle,
  renderMarkdown,
  renderMarkdownHtml,
} from "./pipeline/index.js";
import {
  createAssetResolutionIndex,
  createWikiLinkResolutionIndex,
} from "./path.js";
import type { RenderContext } from "./types.js";

function testContext(
  slug: string,
  allSlugs: string[],
  overrides: Omit<RenderContext, "slug" | "wikilinkIndex"> = {},
): RenderContext {
  return {
    slug,
    wikilinkIndex: createWikiLinkResolutionIndex(allSlugs),
    ...overrides,
  };
}

describe("renderMarkdown", () => {
  it("only analyzes titles from explicit frontmatter", async () => {
    expect(getTitle({ title: "  Frontmatter Title  " })).toBe(
      "Frontmatter Title",
    );
    expect(getTitle({})).toBeUndefined();

    const result = await analyzeMarkdown(
      "# Heading That Should Not Become A Title\n\nLong body. ".repeat(100),
      testContext("index", ["index"]),
    );

    expect(result.title).toBeUndefined();
  }, 15_000);

  it("renders heading title and icon permalinks", async () => {
    const result = await renderMarkdown(
      "## Linked Heading",
      testContext("index", ["index"]),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('<h2 id="linked-heading">');
    expect(html).toContain(
      '<a class="silica-heading-link" href="#linked-heading">Linked Heading',
    );
    expect(html).toContain(
      '<svg aria-hidden="true" class="silica-heading-link-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">',
    );
    expect(html).toContain('<path d="M9 17H7A5 5 0 0 1 7 7h2"></path>');
    expect(html).toContain('<line x1="8" x2="16" y1="12" y2="12"></line>');
  }, 15_000);

  it("renders OFM highlights and callout elements", async () => {
    const result = await renderMarkdown(
      "> [!note] Remember\n> Use ==Silica== carefully.",
      testContext("index", ["index"]),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("<silica-callout");
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('data-callout-title="Remember"');
    expect(html).toContain("<mark>Silica</mark>");
  }, 15_000);

  it("supports foldable callouts and hyphenated custom callout types", async () => {
    const result = await renderMarkdown(
      "> [!custom-tip]- Folded title\n> Hidden body.",
      testContext("index", ["index"]),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("<silica-callout");
    expect(html).toContain('data-callout="custom-tip"');
    expect(html).toContain('data-callout-title="Folded title"');
    expect(html).toContain('data-callout-foldable="true"');
    expect(html).toContain('data-callout-open="false"');
    expect(html).toContain("<p>Hidden body.</p>");
  }, 15_000);

  it("supports custom callout render components", async () => {
    const result = await renderMarkdown(
      "> [!tip] Hint\n> Body.",
      testContext("index", ["index"], {
        components: {
          "silica-callout": ({
            children,
            "data-callout": kind,
            "data-callout-title": title,
          }) => (
            <aside data-rendered-callout={kind} data-title={title}>
              {children}
            </aside>
          ),
        },
      }),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<aside data-rendered-callout="tip" data-title="Hint">',
    );
    expect(html).toContain("<p>Body.</p>");
    expect(html).toContain("</aside>");
  }, 15_000);

  it("resolves wikilinks and records graph links", async () => {
    const markdown = "See [[docs/intro|Intro]].";
    const context = testContext("index", ["index", "docs/intro"]);
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('<a href="/docs/intro">Intro</a>');
    expect(analysis.links).toEqual(["docs/intro"]);
    expect(analysis.brokenLinks).toEqual([]);
  }, 15_000);

  it("records graph links from custom frontmatter properties", async () => {
    const markdown = [
      "---",
      'related: "[[docs/intro|Intro]]"',
      'missing: "[[missing|Missing]]"',
      "---",
      "# Home",
    ].join("\n");
    const analysis = await analyzeMarkdown(
      markdown,
      testContext("index", ["index", "docs/intro"]),
    );

    expect(analysis.links).toEqual(["docs/intro"]);
    expect(analysis.brokenLinks).toEqual([
      { source: "index", target: "missing" },
    ]);
  }, 15_000);

  it("resolves a wikilink with an escaped pipe inside a GFM table cell", async () => {
    const markdown = [
      "| Key | What it does |",
      "| --- | --- |",
      "| tags | Page tags (see [[docs/intro\\|Intro]]) |",
    ].join("\n");
    const context = testContext("index", ["index", "docs/intro"]);
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("<table>");
    expect(html).toContain('<a href="/docs/intro">Intro</a>');
    expect(html).not.toContain("silica-broken-link");
    expect(analysis.links).toEqual(["docs/intro"]);
    expect(analysis.brokenLinks).toEqual([]);
  }, 15_000);

  it("renders a sized embed with an escaped pipe inside a GFM table cell", async () => {
    const result = await renderMarkdown(
      [
        "| Item | Example |",
        "| --- | --- |",
        "| Sized embed | ![[images/photo.png\\|120]] |",
      ].join("\n"),
      testContext("index", ["index"], {
        assetBaseUrl: "/assets",
      }),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("<table>");
    expect(html).toContain('<img src="/assets/images/photo.png"');
    expect(html).toContain('width="120"');
    expect(html).not.toContain("silica-broken-link");
  }, 15_000);

  it("renders unresolved wikilinks as Silica broken-link spans", async () => {
    const markdown = "[[missing|Missing page]]";
    const context = testContext("index", ["index"]);
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<span class="silica-broken-link">Missing page</span>',
    );
    expect(analysis.links).toEqual([]);
    expect(analysis.brokenLinks).toEqual([
      { source: "index", target: "missing" },
    ]);
  }, 15_000);

  it("renders wiki asset embeds with the configured asset base URL", async () => {
    const markdown = "![[images/photo.png|Photo]]";
    const context = testContext("index", ["index"], {
      assetBaseUrl: "/assets",
    });
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('<img src="/assets/images/photo.png" alt="Photo"/>');
    expect(analysis.links).toEqual([]);
    expect(analysis.brokenLinks).toEqual([]);
  }, 15_000);

  it("resolves wiki asset embeds through the asset index", async () => {
    const markdown = "![[photo.png|Photo]]";
    const context = testContext("index", ["index"], {
      assetBaseUrl: "/assets",
      sourcePath: "index.md",
      assetIndex: createAssetResolutionIndex([
        {
          sourcePath: "attachments/photo.png",
          assetPath: "attachments/photo.png",
        },
      ]),
    });
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<img src="/assets/attachments/photo.png" alt="Photo"/>',
    );
    expect(analysis.links).toEqual([]);
    expect(analysis.brokenLinks).toEqual([]);
  }, 15_000);

  it("preserves heading and block fragments in wikilink hrefs", async () => {
    const markdown =
      "[[docs/intro#Install Guide|Install]] and [[index#^block-id|Block]]";
    const context = testContext("index", ["index", "docs/intro"]);
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('<a href="/docs/intro#install-guide">Install</a>');
    expect(html).toContain('<a href="/#^block-id">Block</a>');
    expect(analysis.links).toEqual(["docs/intro", "index"]);
  }, 15_000);

  it("removes comments and renders block IDs and inline footnotes", async () => {
    const markdown =
      "Visible %%hidden%% text ^block-id ^[Inline **note** and [docs](https://example.com)]";
    const context = testContext("index", ["index"]);
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("Visible");
    expect(html).not.toContain("%%hidden%%");
    expect(html).toContain('id="^block-id"');
    expect(html).toContain('id="footnote-label"');
    expect(html).toContain('data-footnote-ref=""');
    expect(html).toContain('<section data-footnotes="" class="footnotes">');
    expect(html).toContain("<p>Inline <strong>note</strong> and ");
    expect(html).toContain(
      '<a href="https://example.com" rel="noreferrer noopener" target="_blank">docs</a>',
    );
    expect(html).not.toContain("<sup>Inline note</sup>");
    expect(result.toc).not.toContainEqual(
      expect.objectContaining({ id: "footnote-label" }),
    );
    expect(analysis.plainText).not.toContain("hidden");
  }, 15_000);

  it("renders media embeds and image dimensions", async () => {
    const result = await renderMarkdown(
      [
        "![[images/photo.png|100x145]]",
        "![[audio/theme.mp3]]",
        "![[video/demo.mp4]]",
        "![[docs/file.pdf#height=400]]",
        "![External|120](https://example.com/image.png)",
      ].join("\n\n"),
      testContext("index", ["index"], {
        assetBaseUrl: "/assets",
      }),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<img src="/assets/images/photo.png" alt="photo.png" width="100" height="145"/>',
    );
    expect(html).toContain('<audio src="/assets/audio/theme.mp3" controls="">');
    expect(html).toContain('<video src="/assets/video/demo.mp4" controls="">');
    expect(html).toContain("<silica-embed");
    expect(html).toContain('height="400"');
    expect(html).toContain(
      '<img src="https://example.com/image.png" alt="External" width="120"/>',
    );
  }, 15_000);

  it("renders resolver-backed note embeds", async () => {
    const markdown = "![[notes/embed-me]]";
    const context = testContext("index", ["index", "notes/embed-me"], {
      resolveEmbed: (
        target: Parameters<NonNullable<RenderContext["resolveEmbed"]>>[0],
      ) =>
        target.path === "notes/embed-me" ? "<p>Embedded note</p>" : undefined,
    });
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('<figure class="silica-embed silica-note-embed"');
    expect(html).not.toContain("<p><figure");
    expect(html).toContain("<p>Embedded note</p>");
    expect(analysis.links).toEqual(["notes/embed-me"]);
    expect(analysis.embeds).toEqual(["notes/embed-me"]);
  }, 15_000);

  it("renders embedded markdown fragments without pre-wrapping headings", async () => {
    const html = await renderMarkdownHtml("## Embedded Heading", {
      ...testContext("notes/embed-me", ["index", "notes/embed-me"]),
    });

    expect(html).toContain("<h2>Embedded Heading</h2>");
    expect(html).not.toContain("silica-heading-link");
  }, 15_000);

  it("wraps fenced code blocks with language metadata", async () => {
    const result = await renderMarkdown(
      "```ts\nconst x: number = 1;\n```\n\n```\nplain text only\n```\n",
      testContext("index", ["index"]),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("<silica-code-block");
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('data-language-label="TypeScript"');
    expect(
      (html.match(/<silica-code-block/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
    expect(html).toContain("<pre");
  }, 15_000);

  it("does not transform OFM syntax inside fenced code blocks", async () => {
    const markdown = "```markdown\n[[other-page]]\n#tag\n==highlight==\n```\n";
    const context = testContext("index", ["index", "other-page"]);
    const result = await renderMarkdown(markdown, context);
    const analysis = await analyzeMarkdown(markdown, context);

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("other-page");
    expect(html).toContain("#tag");
    expect(html).toContain("==highlight==");
    expect(html).not.toContain('href="/other-page"');
    expect(html).not.toContain("silica-broken-link");
    expect(analysis.links).toEqual([]);
  }, 15_000);

  it("renders Mermaid fences as silica-mermaid elements", async () => {
    const result = await renderMarkdown(
      "```mermaid\ngraph TD\nA --> B\n```",
      testContext("index", ["index"]),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("<silica-mermaid");
    expect(html).toContain('data-language="mermaid"');
    expect(html).toContain("graph TD");
  }, 15_000);

  it("supports custom code block render components", async () => {
    const result = await renderMarkdown(
      "```ts\nconst x: number = 1;\n```",
      testContext("index", ["index"], {
        components: {
          "silica-code-block": ({
            children,
            "data-language": language,
            "data-language-label": label,
          }) => (
            <figure data-rendered-code-block={language} data-title={label}>
              {children}
            </figure>
          ),
        },
      }),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<figure data-rendered-code-block="ts" data-title="TypeScript">',
    );
    expect(html).toContain("<pre");
  }, 15_000);

  it("sanitizes raw HTML and escapes OFM-injected labels", async () => {
    const result = await renderMarkdown(
      '[[<img src=x onerror=alert(1)>]]\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<h2 id="raw-id">Raw heading</h2>\n\n<h2 id="footnote-label">User heading</h2>',
      testContext("index", ["index"]),
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).not.toContain("<script");
    expect(html).not.toContain('<img src="x" onerror=');
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain('id="user-content-raw-id"');
    expect(html).toContain('id="user-content-footnote-label"');
    expect(html).not.toContain('id="footnote-label"');
  }, 15_000);
});
