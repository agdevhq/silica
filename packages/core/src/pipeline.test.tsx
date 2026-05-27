import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./pipeline/index.js";

describe("renderMarkdown", () => {
  it("renders heading title and icon permalinks", async () => {
    const result = await renderMarkdown("## Linked Heading", {
      slug: "index",
      allSlugs: ["index"],
    });

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
      {
        slug: "index",
        allSlugs: ["index"],
      },
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
      {
        slug: "index",
        allSlugs: ["index"],
      },
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
    const result = await renderMarkdown("> [!tip] Hint\n> Body.", {
      slug: "index",
      allSlugs: ["index"],
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
    });

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<aside data-rendered-callout="tip" data-title="Hint">',
    );
    expect(html).toContain("<p>Body.</p>");
    expect(html).toContain("</aside>");
  }, 15_000);

  it("wraps fenced code blocks with language metadata", async () => {
    const result = await renderMarkdown(
      "```ts\nconst x: number = 1;\n```\n\n```\nplain text only\n```\n",
      {
        slug: "index",
        allSlugs: ["index"],
      },
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
    const result = await renderMarkdown(
      "```markdown\n[[other-page]]\n#tag\n==highlight==\n```\n",
      {
        slug: "index",
        allSlugs: ["index", "other-page"],
      },
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain("other-page");
    expect(html).toContain("#tag");
    expect(html).toContain("==highlight==");
    expect(html).not.toContain('href="/other-page"');
    expect(html).not.toContain("silica-broken-link");
    expect(result.links).toEqual([]);
  }, 15_000);

  it("supports custom code block render components", async () => {
    const result = await renderMarkdown("```ts\nconst x: number = 1;\n```", {
      slug: "index",
      allSlugs: ["index"],
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
    });

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain(
      '<figure data-rendered-code-block="ts" data-title="TypeScript">',
    );
    expect(html).toContain("<pre");
  }, 15_000);

  it("sanitizes raw HTML and escapes OFM-injected labels", async () => {
    const result = await renderMarkdown(
      "[[<img src=x onerror=alert(1)>]]\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>",
      {
        slug: "index",
        allSlugs: ["index"],
      },
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).not.toContain("<script");
    expect(html).not.toContain('<img src="x" onerror=');
    expect(html).toContain("&lt;img src=x");
  }, 15_000);
});
