import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeReact from "rehype-react";
import rehypeStringify from "rehype-stringify";
import { getTags, remarkObsidian } from "@silicajs/remark-obsidian";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { visit } from "unist-util-visit";
import type {
  AnalyzeResult,
  RenderContext,
  RenderResult,
  TocItem,
} from "../types.js";
import { rehypeShikiCodeBlockWrapper } from "./code-block.js";
import {
  createSilicaObsidianHandlers,
  remarkSilicaObsidian,
} from "./obsidian.js";
import {
  getDataArray,
  mergeBrokenLinks,
  rehypeCleanFootnoteHeadings,
  rehypeCollectTocAndLinks,
  rehypeExternalLinks,
  rehypeRestoreObsidianBlockIds,
  rehypeUnwrapSilicaEmbeds,
} from "./plugins.js";

type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
};

const headingLinkIcon = {
  type: "element",
  tagName: "svg",
  properties: {
    ariaHidden: "true",
    className: ["silica-heading-link-icon"],
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  },
  children: [
    {
      type: "element",
      tagName: "path",
      properties: {
        d: "M9 17H7A5 5 0 0 1 7 7h2",
      },
      children: [],
    },
    {
      type: "element",
      tagName: "path",
      properties: {
        d: "M15 7h2a5 5 0 1 1 0 10h-2",
      },
      children: [],
    },
    {
      type: "element",
      tagName: "line",
      properties: {
        x1: 8,
        x2: 16,
        y1: 12,
        y2: 12,
      },
      children: [],
    },
  ],
} as const;

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", "silica-broken-link"],
      ["className", "silica-block-id"],
      ["dataSilicaBlockId"],
      ["data-silica-block-id"],
      ["ariaHidden"],
      ["aria-hidden"],
    ],
    sup: [
      ...(defaultSchema.attributes?.sup ?? []),
      ["className", "silica-inline-footnote"],
    ],
    img: [...(defaultSchema.attributes?.img ?? []), ["width"], ["height"]],
    audio: [["src"], ["controls"], ["width"], ["height"]],
    video: [["src"], ["controls"], ["width"], ["height"]],
    source: [["src"], ["type"]],
    figure: [
      ...(defaultSchema.attributes?.figure ?? []),
      ["className", "silica-embed", "silica-note-embed"],
      ["dataEmbedKind"],
      ["data-embed-kind"],
      ["dataEmbedTarget"],
      ["data-embed-target"],
    ],
    strong: [
      ...(defaultSchema.attributes?.strong ?? []),
      ["className", "silica-callout-title"],
      ["dataCallout"],
      ["data-callout"],
      ["dataCalloutFold"],
      ["data-callout-fold"],
    ],
    "silica-callout": [
      ["className", "silica-callout"],
      ["dataCallout"],
      ["data-callout"],
      ["dataCalloutTitle"],
      ["data-callout-title"],
      ["dataCalloutFoldable"],
      ["data-callout-foldable"],
      ["dataCalloutOpen"],
      ["data-callout-open"],
    ],
    "silica-embed": [
      ["src"],
      ["width"],
      ["height"],
      ["dataEmbedKind"],
      ["data-embed-kind"],
      ["dataEmbedTarget"],
      ["data-embed-target"],
    ],
    "silica-mermaid": [
      ["dataSource"],
      ["data-source"],
      ["dataLanguage"],
      ["data-language"],
      ["dataLanguageLabel"],
      ["data-language-label"],
    ],
    mark: defaultSchema.attributes?.mark ?? [],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "mark",
    "audio",
    "video",
    "source",
    "figure",
    "silica-callout",
    "silica-embed",
    "silica-mermaid",
  ],
};

export async function renderMarkdown(
  raw: string,
  context: RenderContext,
): Promise<RenderResult> {
  const parsed = matter(raw);
  const inlineTags = context.tags?.inline ?? true;
  const processor = baseProcessor(context)
    .use(rehypeUnwrapSilicaEmbeds)
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeRestoreObsidianBlockIds)
    .use(rehypeUnwrapSilicaEmbeds)
    .use(rehypeKatex);

  if (hasCodeFence(parsed.content)) {
    processor.use(rehypeShiki, {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: "light-dark()",
      // Ensure unlabeled fences still flow through Shiki so they pick up the
      // wrapper transformer below (just without a language header).
      defaultLanguage: "text",
      rootStyle: false,
      transformers: [rehypeShikiCodeBlockWrapper()],
    });
  }

  processor
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      content: headingLinkIcon,
      properties: { className: ["silica-heading-link"] },
    })
    .use(rehypeCleanFootnoteHeadings)
    .use(rehypeCollectTocAndLinks)
    .use(rehypeExternalLinks)
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
      components: context.components,
    });

  const file = await processor.process(parsed.content);
  const frontmatter = parsed.data;
  const obsidianBrokenLinks = getDataArray<{ target: string }>(
    file.data,
    "silicaObsidianBrokenLinks",
  ).map((link) => ({ source: String(context.slug), target: link.target }));
  const links = unique([
    ...getDataArray<string>(file.data, "silicaObsidianLinks"),
    ...getDataArray<string>(file.data, "links"),
  ]);
  const toc = getDataArray<TocItem>(file.data, "toc");
  const plainText = extractPlainText(parsed.content);

  return {
    content: file.result,
    frontmatter,
    toc,
    links,
    brokenLinks: mergeBrokenLinks(obsidianBrokenLinks, []),
    plainText,
    title: getTitle(frontmatter, plainText),
    description: getDescription(frontmatter, plainText),
    tags: getTags(frontmatter, parsed.content, { inline: inlineTags }),
  };
}

export async function renderMarkdownHtml(
  raw: string,
  context: RenderContext,
): Promise<string> {
  const parsed = matter(raw);
  const processor = baseProcessor(context)
    .use(rehypeUnwrapSilicaEmbeds)
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeRestoreObsidianBlockIds)
    .use(rehypeUnwrapSilicaEmbeds)
    .use(rehypeKatex);

  if (hasCodeFence(parsed.content)) {
    processor.use(rehypeShiki, {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: "light-dark()",
      defaultLanguage: "text",
      rootStyle: false,
      transformers: [rehypeShikiCodeBlockWrapper()],
    });
  }

  processor.use(rehypeExternalLinks).use(rehypeStringify);

  const file = await processor.process(parsed.content);
  return String(file);
}

export async function analyzeMarkdown(
  raw: string,
  context: RenderContext,
): Promise<AnalyzeResult> {
  const parsed = matter(raw);
  const inlineTags = context.tags?.inline ?? true;
  const file = await runRemarkObsidian(parsed.content, context);
  const plainText = extractPlainText(parsed.content);
  const frontmatter = parsed.data;
  const brokenLinks = getDataArray<{ target: string }>(
    file.data,
    "silicaObsidianBrokenLinks",
  ).map((link) => ({ source: String(context.slug), target: link.target }));

  return {
    frontmatter,
    toc: [],
    links: getDataArray<string>(file.data, "silicaObsidianLinks"),
    brokenLinks,
    plainText,
    title: getTitle(frontmatter, plainText),
    description: getDescription(frontmatter, plainText),
    tags: getTags(frontmatter, parsed.content, { inline: inlineTags }),
  };
}

export function getTitle(
  frontmatter: Record<string, unknown>,
  plainText: string,
): string | undefined {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim())
    return frontmatter.title.trim();
  const heading = plainText
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return heading?.replace(/^#+\s*/, "");
}

export function getDescription(
  frontmatter: Record<string, unknown>,
  plainText: string,
): string | undefined {
  if (
    typeof frontmatter.description === "string" &&
    frontmatter.description.trim()
  ) {
    return frontmatter.description.trim();
  }
  const sentence = extractPlainText(plainText).slice(0, 180).trim();
  return sentence || undefined;
}

function baseProcessor(context: RenderContext) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkObsidian, { inlineTags: context.tags?.inline ?? true })
    .use(remarkSilicaObsidian, context)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers: createSilicaObsidianHandlers(context),
    });
}

async function runRemarkObsidian(markdown: string, context: RenderContext) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkObsidian, { inlineTags: context.tags?.inline ?? true })
    .use(remarkSilicaObsidian, context);
  const tree = processor.parse(markdown);
  const file = { data: {} };
  await processor.run(tree, file);
  return file;
}

function remarkCollectPlainText() {
  return (tree: MdastNode, file: { data: Record<string, unknown> }) => {
    const parts: string[] = [];
    visit(tree, (node: MdastNode) => {
      if (typeof node.value === "string") parts.push(node.value);
    });
    file.data.plainText = parts.join(" ");
  };
}

function extractPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/\^\[[^\]]+]/g, "")
    .replace(/(?:^|\s)\^[A-Za-z0-9-]+/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_\-~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCodeFence(markdown: string): boolean {
  return /(^|\n)(```|~~~)/.test(markdown);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
