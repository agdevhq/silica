import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./pipeline/index.js";

describe("renderMarkdown", () => {
  it("renders OFM highlights and callout title markup", async () => {
    const result = await renderMarkdown("> [!note] Remember\n> Use ==Silica== carefully.", {
      slug: "index",
      allSlugs: ["index"],
    });

    const html = renderToStaticMarkup(<>{result.content}</>);

    expect(html).toContain('class="silica-callout-title"');
    expect(html).toContain("<mark>Silica</mark>");
  });
});
