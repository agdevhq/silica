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
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import rehypeReact from "rehype-react";
import rehypeStringify from "rehype-stringify";
import { getTags, remarkObsidian } from "@silicajs/remark-obsidian";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type {
  AnalyzeResult,
  RenderContext,
  RenderResult,
  TocItem,
} from "../types.js";
import { rehypeShikiCodeBlockWrapper } from "./code-block.js";
import { getSilicaHighlighter, SILICA_SHIKI_THEMES } from "./highlighter.js";
import {
  createSilicaObsidianHandlers,
  remarkSilicaObsidian,
} from "./obsidian.js";
import { analyzePagePropertyLinks } from "./frontmatter.js";
import {
  getDataArray,
  rehypeCleanFootnoteHeadings,
  rehypeCollectTocAndLinks,
  rehypeExternalLinks,
  rehypeRestoreObsidianBlockIds,
  rehypeUnwrapSilicaEmbeds,
} from "./plugins.js";

type MdastNode = {
  type: string;
  value?: string;
  raw?: string;
  tag?: string;
  children?: MdastNode[];
};

type PlainTextOptions = {
  skipLeadingHeading?: boolean;
};

const plainTextSkipTypes = new Set([
  "code",
  "definition",
  "footnoteDefinition",
  "footnoteReference",
  "image",
  "imageReference",
  "inlineMath",
  "math",
  "obsidianBlockId",
  "obsidianComment",
  "obsidianWikiEmbed",
  "thematicBreak",
  "yaml",
]);

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
  const processor = baseProcessor(context)
    .use(rehypeUnwrapSilicaEmbeds)
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeRestoreObsidianBlockIds)
    .use(rehypeUnwrapSilicaEmbeds)
    .use(rehypeKatex);

  if (hasCodeFence(parsed.content)) {
    const highlighter = await getSilicaHighlighter();
    processor.use(rehypeShikiFromHighlighter, highlighter, {
      themes: SILICA_SHIKI_THEMES,
      defaultColor: "light-dark()",
      // Ensure unlabeled fences still flow through Shiki so they pick up the
      // wrapper transformer below (just without a language header).
      defaultLanguage: "text",
      fallbackLanguage: "text",
      lazy: true,
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
  const toc = getDataArray<TocItem>(file.data, "toc");

  return {
    content: file.result,
    toc,
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
    const highlighter = await getSilicaHighlighter();
    processor.use(rehypeShikiFromHighlighter, highlighter, {
      themes: SILICA_SHIKI_THEMES,
      defaultColor: "light-dark()",
      defaultLanguage: "text",
      fallbackLanguage: "text",
      lazy: true,
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
  const contentBrokenLinks = getDataArray<{ target: string }>(
    file.data,
    "silicaObsidianBrokenLinks",
  ).map((link) => ({ source: String(context.slug), target: link.target }));
  const pagePropertyLinks = analyzePagePropertyLinks(frontmatter, context);
  const description = getDescription(frontmatter);

  return {
    frontmatter,
    links: [
      ...new Set([
        ...getDataArray<string>(file.data, "silicaObsidianLinks"),
        ...pagePropertyLinks.links,
      ]),
    ],
    embeds: getDataArray<string>(file.data, "silicaObsidianEmbeds"),
    brokenLinks: [...contentBrokenLinks, ...pagePropertyLinks.brokenLinks],
    plainText,
    title: getTitle(frontmatter),
    description,
    generatedDescription: description
      ? undefined
      : generateDescriptionFromContent(parsed.content),
    tags: getTags(frontmatter, parsed.content, { inline: inlineTags }),
  };
}

export function getTitle(
  frontmatter: Record<string, unknown>,
): string | undefined {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim())
    return frontmatter.title.trim();
  return undefined;
}

export function getDescription(
  frontmatter: Record<string, unknown>,
): string | undefined {
  if (
    typeof frontmatter.description === "string" &&
    frontmatter.description.trim()
  ) {
    return cleanPlainText(frontmatter.description.trim());
  }
  return undefined;
}

export function generateDescriptionFromContent(
  markdown: string,
  maxLength = 160,
): string | undefined {
  return cleanPlainText(markdown, maxLength, { skipLeadingHeading: true });
}

export function getMetaDescription(
  entry: {
    description?: string;
    generatedDescription?: string;
  },
  maxLength = 160,
): string | undefined {
  const text = entry.description ?? entry.generatedDescription;
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return cleanPlainText(text, maxLength);
}

function cleanPlainText(
  text: string,
  maxLength?: number,
  options: PlainTextOptions = {},
): string | undefined {
  const cleaned = extractPlainText(text, options).trim();
  if (!cleaned) return undefined;
  if (maxLength === undefined) return cleaned;
  const truncated = cleaned.slice(0, maxLength).trim();
  return truncated || undefined;
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

function extractPlainText(
  markdown: string,
  options: PlainTextOptions = {},
): string {
  const tree = parsePlainTextMarkdown(markdown);
  const children =
    options.skipLeadingHeading && tree.children?.[0]?.type === "heading"
      ? tree.children.slice(1)
      : (tree.children ?? []);
  const parts: string[] = [];

  for (const child of children) {
    collectPlainText(child, parts);
  }

  return normalizePlainText(parts.join(" "));
}

function parsePlainTextMarkdown(markdown: string): MdastNode {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkObsidian)
    .parse(markdown) as MdastNode;
}

function collectPlainText(node: MdastNode, parts: string[]): void {
  if (plainTextSkipTypes.has(node.type)) return;

  if (node.type === "obsidianTag") {
    const raw = node.raw?.replace(/^#/, "");
    const tag = raw || node.tag;
    if (tag) parts.push(tag);
    return;
  }

  if (typeof node.value === "string") {
    parts.push(node.value);
  }

  for (const child of node.children ?? []) {
    collectPlainText(child, parts);
  }
}

function normalizePlainText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function hasCodeFence(markdown: string): boolean {
  return /(^|\n)(```|~~~)/.test(markdown);
}
