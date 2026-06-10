import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";
import matter from "gray-matter";
import type { ResolvedSilicaConfig } from "./types.js";
import { asFilePath, slugifyAssetPath, slugifyFilePath } from "./path.js";

export type ContentMarkdownFile = {
  absolutePath: string;
  sourcePath: string;
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
  sourcePath: string;
  assetPath: string;
};

export type ContentScan = {
  markdown: ContentMarkdownFile[];
  assets: ContentAssetFile[];
};

export async function scanContent(
  projectRoot: string,
  config: ResolvedSilicaConfig,
): Promise<ContentScan> {
  const contentRoot = path.join(projectRoot, config.contentDir);
  const realContentRoot = await fs.realpath(contentRoot);
  const entries = await fg("**/*", {
    cwd: contentRoot,
    dot: false,
    followSymbolicLinks: false,
    onlyFiles: true,
    unique: true,
  });

  const markdown: ContentMarkdownFile[] = [];
  const assets: ContentAssetFile[] = [];

  for (const relativePath of entries.sort()) {
    const sourcePath = relativePath.replace(/\\/g, "/");
    const absolutePath = path.join(contentRoot, relativePath);
    const stats = await fs.lstat(absolutePath);
    if (!stats.isFile()) continue;
    if (!(await isWithinRoot(absolutePath, realContentRoot))) continue;

    if (isMarkdownFile(relativePath)) {
      const raw = await fs.readFile(absolutePath, "utf8");
      const parsed = matter(raw);
      markdown.push({
        absolutePath,
        sourcePath,
        slug: slugifyFilePath(
          asFilePath(relativePath),
          config.contentDir,
          config.ordering,
        ),
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
        sourcePath,
        assetPath: slugifyAssetPath(sourcePath, config.ordering),
      });
    }
  }

  assertUniqueAssetPaths(assets);

  return { markdown, assets };
}

function assertUniqueAssetPaths(assets: ContentAssetFile[]) {
  const sourcePathByAssetPath = new Map<string, string>();
  for (const asset of assets) {
    const existing = sourcePathByAssetPath.get(asset.assetPath);
    if (existing && existing !== asset.sourcePath) {
      throw new Error(
        `Asset path collision: ${existing} and ${asset.sourcePath} both map to ${asset.assetPath}`,
      );
    }
    sourcePathByAssetPath.set(asset.assetPath, asset.sourcePath);
  }
}

async function isWithinRoot(
  absolutePath: string,
  realRoot: string,
): Promise<boolean> {
  const realPath = await fs.realpath(absolutePath);
  const relative = path.relative(realRoot, realPath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(filePath);
}
