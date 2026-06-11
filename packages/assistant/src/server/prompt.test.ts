import { describe, expect, it } from "vitest";
import type { AssistantSiteContext } from "../types.js";
import { buildSystemPrompt } from "./prompt.js";

const site: AssistantSiteContext = {
  siteTitle: "Docs",
  siteDescription: "A product documentation site.",
  homePage: {
    title: "Welcome",
    sourcePath: "index.md",
    excerpt: "Docs helps teams understand the product.",
  },
  contentRoot: "/project/.silica/content",
  resolveCitation: () => undefined,
};

describe("buildSystemPrompt", () => {
  it("includes homepage context and permits direct simple answers", () => {
    const prompt = buildSystemPrompt(site);

    expect(prompt).toContain('Site overview ("Welcome")');
    expect(prompt).not.toContain("Site overview from /content/index.md");
    expect(prompt).toContain("Docs helps teams understand the product.");
    expect(prompt).toContain(
      "If you use the site overview, cite index.md in the sources block. Never mention source paths, /content, or markdown filenames in the visible answer.",
    );
    expect(prompt).toContain(
      "Answer greetings, thanks, brief conversational turns, assistant capability questions, and clearly off-topic requests directly without using `bash`.",
    );
    expect(prompt).toContain(
      "You may use the site overview above to answer generic questions about what the site is without first using `bash`; cite the overview's source path if you use it.",
    );
    expect(prompt).toContain(
      "If you did not use any site files or the site overview, leave the sources block empty.",
    );
  });
});
