import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeReact from "rehype-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { visit } from "unist-util-visit";
import type { AnalyzeResult, RenderContext, RenderResult, TocItem } from "../types.js";
import { transformObsidianMarkdown } from "./ofm.js";
import { getDataArray, mergeBrokenLinks, rehypeCollectTocAndLinks, rehypeExternalLinks } from "./plugins.js";

type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
};

export async function renderMarkdown(raw: string, context: RenderContext): Promise<RenderResult> {
  const parsed = matter(raw);
  const transformed = transformObsidianMarkdown(parsed.content, context);
  const processor = baseProcessor()
    .use(rehypeKatex)
    .use(rehypeShiki, {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeCollectTocAndLinks)
    .use(rehypeExternalLinks)
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
    });

  const file = await processor.process(transformed.markdown);
  const frontmatter = parsed.data;
  const links = unique([...transformed.links, ...getDataArray<string>(file.data, "links")]);
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
    tags: getTags(frontmatter),
  };
}

export async function analyzeMarkdown(raw: string, context: RenderContext): Promise<AnalyzeResult> {
  const parsed = matter(raw);
  const transformed = transformObsidianMarkdown(parsed.content, context);
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
    tags: getTags(frontmatter),
  };
}

export function getTitle(frontmatter: Record<string, unknown>, plainText: string): string | undefined {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim()) return frontmatter.title.trim();
  const heading = plainText
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return heading?.replace(/^#+\s*/, "");
}

export function getDescription(frontmatter: Record<string, unknown>, plainText: string): string | undefined {
  if (typeof frontmatter.description === "string" && frontmatter.description.trim()) {
    return frontmatter.description.trim();
  }
  const sentence = extractPlainText(plainText).slice(0, 180).trim();
  return sentence || undefined;
}

export function getTags(frontmatter: Record<string, unknown>): string[] {
  const value = frontmatter.tags ?? frontmatter.tag;
  if (Array.isArray(value)) return value.map(String).map(normalizeTag).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\s]+/).map(normalizeTag).filter(Boolean);
  return [];
}

function baseProcessor() {
  return unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm).use(remarkMath).use(remarkRehype, {
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

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
