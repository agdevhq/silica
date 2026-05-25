import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";
import matter from "gray-matter";
import type { ResolvedSilicaConfig } from "./types.js";
import { asFilePath, slugifyFilePath } from "./path.js";

export type ContentMarkdownFile = {
  absolutePath: string;
  relativePath: string;
  slug: string;
  raw: string;
  body: string;
  frontmatter: Record<string, unknown>;
  stats: {
    birthtime?: Date;
    mtime?: Date;
  };
};

export type ContentAssetFile = {
  absolutePath: string;
  relativePath: string;
};

export type ContentScan = {
  markdown: ContentMarkdownFile[];
  assets: ContentAssetFile[];
};

export async function scanContent(projectRoot: string, config: ResolvedSilicaConfig): Promise<ContentScan> {
  const contentRoot = path.join(projectRoot, config.contentDir);
  const entries = await fg("**/*", {
    cwd: contentRoot,
    dot: false,
    onlyFiles: true,
    unique: true,
  });

  const markdown: ContentMarkdownFile[] = [];
  const assets: ContentAssetFile[] = [];

  for (const relativePath of entries.sort()) {
    const absolutePath = path.join(contentRoot, relativePath);
    if (isMarkdownFile(relativePath)) {
      const raw = await fs.readFile(absolutePath, "utf8");
      const parsed = matter(raw);
      const stats = await fs.stat(absolutePath);
      markdown.push({
        absolutePath,
        relativePath: relativePath.replace(/\\/g, "/"),
        slug: slugifyFilePath(asFilePath(relativePath)),
        raw,
        body: parsed.content,
        frontmatter: parsed.data,
        stats: {
          birthtime: stats.birthtime,
          mtime: stats.mtime,
        },
      });
    } else {
      assets.push({
        absolutePath,
        relativePath: relativePath.replace(/\\/g, "/"),
      });
    }
  }

  return { markdown, assets };
}

export function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(filePath);
}
