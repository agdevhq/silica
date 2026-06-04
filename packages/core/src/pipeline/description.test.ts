import { describe, expect, it } from "vitest";
import {
  generateDescriptionFromContent,
  getDescription,
  getMetaDescription,
} from "./index.js";

describe("getDescription", () => {
  it("returns a cleaned frontmatter description", () => {
    expect(getDescription({ description: "  Intro  " })).toBe("Intro");
    expect(getDescription({ description: "**Bold** and #tag" })).toBe(
      "Bold and tag",
    );
  });

  it("returns undefined when no description is defined", () => {
    expect(getDescription({})).toBeUndefined();
    expect(getDescription({ description: "   " })).toBeUndefined();
  });
});

describe("generateDescriptionFromContent", () => {
  it("builds a clean fallback from note content", () => {
    expect(
      generateDescriptionFromContent(
        "# Getting Started\n\nSee [[Notes/Auth|Auth]] and **bold** text with #tag.",
      ),
    ).toBe("See Auth and bold text with tag.");
  });

  it("keeps visible link text without URLs or markdown punctuation", () => {
    expect(
      generateDescriptionFromContent(
        "# Title\n\nRead [the guide](https://example.com) and `inline code`.",
      ),
    ).toBe("Read the guide and inline code.");
  });

  it("skips the leading heading to avoid duplicating the page title", () => {
    expect(generateDescriptionFromContent("# Title\n\nPlain intro.")).toBe(
      "Plain intro.",
    );
  });

  it("strips code blocks and embeds from the fallback", () => {
    expect(
      generateDescriptionFromContent(
        "# Title\n\n```ts\nconst x = 1;\n```\n\n![[diagram.png]]\n\nPlain intro.",
      ),
    ).toBe("Plain intro.");
    expect(
      generateDescriptionFromContent(
        "# Title\n\n~~~ts\nconst x = 1;\n~~~\n\nPlain intro.",
      ),
    ).toBe("Plain intro.");
  });

  it("strips non-human-readable Markdown and Obsidian nodes", () => {
    expect(
      generateDescriptionFromContent(
        [
          "# Title",
          "",
          "$$x = y$$",
          "",
          "![Alt text](diagram.png)",
          "",
          "%% hidden comment %%",
          "",
          "Text with ^block-id and $inline_math$.",
        ].join("\n"),
      ),
    ).toBe("Text with and.");
  });

  it("returns undefined when there is no usable fallback text", () => {
    expect(
      generateDescriptionFromContent("```\ncode only\n```"),
    ).toBeUndefined();
    expect(generateDescriptionFromContent("# Title only")).toBeUndefined();
  });
});

describe("getMetaDescription", () => {
  it("prefers a manual description over the generated fallback", () => {
    expect(
      getMetaDescription({
        description: "Custom summary",
        generatedDescription: "Generated fallback",
      }),
    ).toBe("Custom summary");
  });

  it("uses the generated fallback when no manual description is set", () => {
    expect(
      getMetaDescription({
        generatedDescription: "Generated fallback",
      }),
    ).toBe("Generated fallback");
  });

  it("truncates long manual descriptions for meta tags", () => {
    const description = "word ".repeat(40).trim();
    expect(description.length).toBeGreaterThan(160);
    expect(
      getMetaDescription({
        description,
      })?.length,
    ).toBeLessThanOrEqual(160);
  });
});
