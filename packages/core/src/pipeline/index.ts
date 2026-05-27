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
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { visit } from "unist-util-visit";
import type {
  AnalyzeResult,
  RenderContext,
  RenderResult,
  TocItem,
} from "../types.js";
import { transformObsidianMarkdown } from "./ofm.js";
import { rehypeShikiCodeBlockWrapper } from "./code-block.js";
import {
  getDataArray,
  mergeBrokenLinks,
  rehypeCollectTocAndLinks,
  rehypeExternalLinks,
  rehypeObsidianCallouts,
} from "./plugins.js";
import { getTags } from "./tags.js";
export { getTags } from "./tags.js";

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
    ],
    strong: [
      ...(defaultSchema.attributes?.strong ?? []),
      ["className", "silica-callout-title"],
      ["dataCallout"],
      ["data-callout"],
      ["dataCalloutFold"],
      ["data-callout-fold"],
    ],
    mark: defaultSchema.attributes?.mark ?? [],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "mark"],
};

export async function renderMarkdown(
  raw: string,
  context: RenderContext,
): Promise<RenderResult> {
  const parsed = matter(raw);
  const transformed = transformObsidianMarkdown(parsed.content, context);
  const inlineTags = context.tags?.inline ?? true;
  const processor = baseProcessor()
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeObsidianCallouts)
    .use(rehypeKatex);

  if (hasCodeFence(transformed.markdown)) {
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
    .use(rehypeCollectTocAndLinks)
    .use(rehypeExternalLinks)
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
      components: context.components,
    });

  const file = await processor.process(transformed.markdown);
  const frontmatter = parsed.data;
  const links = unique([
    ...transformed.links,
    ...getDataArray<string>(file.data, "links"),
  ]);
  const toc = getDataArray<TocItem>(file.data, "toc");
  const plainText = extractPlainText(parsed.content);

  return {
    content: file.result,
    frontmatter,
    toc,
    links,
    brokenLinks: mergeBrokenLinks(transformed.brokenLinks, []),
    plainText,
    title: getTitle(frontmatter, plainText),
    description: getDescription(frontmatter, plainText),
    tags: getTags(frontmatter, parsed.content, { inline: inlineTags }),
  };
}

export async function analyzeMarkdown(
  raw: string,
  context: RenderContext,
): Promise<AnalyzeResult> {
  const parsed = matter(raw);
  const transformed = transformObsidianMarkdown(parsed.content, context);
  const inlineTags = context.tags?.inline ?? true;
  const plainText = extractPlainText(transformed.markdown);
  const frontmatter = parsed.data;

  return {
    frontmatter,
    toc: [],
    links: transformed.links,
    brokenLinks: transformed.brokenLinks,
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

function baseProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, {
      allowDangerousHtml: true,
    });
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
