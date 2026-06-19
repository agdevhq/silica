import path from "node:path";
import { watch } from "chokidar";
import fs from "fs-extra";
import Database from "better-sqlite3";
import { precompute } from "@silicajs/core";

export type WatchOptions = {
  projectRoot: string;
  port?: number;
  onConfigChange?: () => void | Promise<void>;
};

export function resolveWatchPaths(projectRoot: string): string[] {
  return [
    path.join(projectRoot, "content"),
    path.join(projectRoot, "themes"),
    path.join(projectRoot, "silica.config.ts"),
  ];
}

export function watchContent({
  projectRoot,
  port = 3000,
  onConfigChange,
}: WatchOptions) {
  const watcher = watch(resolveWatchPaths(projectRoot), {
    ignoreInitial: true,
  });

  let pending: Promise<void> | undefined;
  watcher.on("all", (_event, filePath) => {
    pending ??= Promise.resolve()
      .then(async () => {
        if (requiresRestart(filePath, projectRoot)) {
          await onConfigChange?.();
          return;
        }
        const previous = await readRenderHashes(projectRoot);
        await precompute({ projectRoot });
        const current = await readRenderHashes(projectRoot);
        const changedSlugs = getChangedSlugs(previous, current);
        for (const slug of changedSlugs) {
          const response = await fetch(
            `http://localhost:${port}/api/silica/revalidate?tag=${encodeURIComponent(
              `page:${slug}`,
            )}`,
            {
              method: "POST",
              headers: {
                "x-silica-revalidate-secret":
                  process.env.SILICA_REVALIDATE_SECRET ?? "",
              },
            },
          ).catch(() => undefined);
          if (!response?.ok) {
            const detail = response
              ? `${response.status} ${response.statusText}`
              : "network error";
            console.warn(`[silica] revalidate failed (${detail})`);
          }
        }
        console.log(`[silica] rebuilt content after ${filePath}`);
      })
      .finally(() => {
        pending = undefined;
      });
  });

  return watcher;
}

async function readRenderHashes(
  projectRoot: string,
): Promise<Map<string, string>> {
  const databasePath = path.join(projectRoot, ".silica/next/data/vault.db");
  if (!(await fs.pathExists(databasePath))) return new Map();
  const db = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  try {
    db.pragma("query_only = ON");
    const rows = db
      .prepare("SELECT slug, render_hash FROM notes")
      .all() as Array<{ slug: string; render_hash: string }>;
    return new Map(rows.map((row) => [row.slug, row.render_hash]));
  } finally {
    db.close();
  }
}

function getChangedSlugs(
  previous: Map<string, string>,
  current: Map<string, string>,
): string[] {
  const changed: string[] = [];
  for (const [slug, renderHash] of current) {
    if (previous.get(slug) !== renderHash) changed.push(slug);
  }
  for (const slug of previous.keys()) {
    if (!current.has(slug)) changed.push(slug);
  }
  return changed;
}

export function requiresRestart(
  filePath: string,
  projectRoot?: string,
): boolean {
  const normalized =
    path.isAbsolute(filePath) && projectRoot
      ? path.relative(projectRoot, filePath).replace(/\\/g, "/")
      : filePath.replace(/\\/g, "/");
  return normalized === "silica.config.ts" || normalized.startsWith("themes/");
}

export function resolveDevPort(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.PORT);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
}
