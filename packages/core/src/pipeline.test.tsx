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

  it("renders OFM highlights and callout title markup", async () => {
    const result = await renderMarkdown(
      "> [!note] Remember\n> Use ==Silica== carefully.",
      {
        slug: "index",
        allSlugs: ["index"],
      },
    );

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('class="silica-callout-title"');
    expect(html).toContain("<mark>Silica</mark>");
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
