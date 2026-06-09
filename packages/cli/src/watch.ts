import path from "node:path";
import { watch } from "chokidar";
import fs from "fs-extra";
import { precompute } from "@silicajs/core";
import type { RouteCacheKeyManifest } from "@silicajs/core";

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
        const previous = await readRenderKeys(projectRoot);
        const result = await precompute({ projectRoot });
        const changedSlugs = getChangedSlugs(previous, result.routeCacheKeys);
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

async function readRenderKeys(
  projectRoot: string,
): Promise<RouteCacheKeyManifest | undefined> {
  return fs
    .readJson(path.join(projectRoot, ".silica/route-cache-keys.json"))
    .catch(() => undefined) as Promise<RouteCacheKeyManifest | undefined>;
}

function getChangedSlugs(
  previous: RouteCacheKeyManifest | undefined,
  current: RouteCacheKeyManifest,
): string[] {
  const currentSlugs = new Set(Object.keys(current.entries));
  const changed = Object.entries(current.entries)
    .filter(
      ([slug, entry]) =>
        previous?.entries[slug]?.renderHash !== entry.renderHash,
    )
    .map(([slug]) => slug);
  if (!previous) return changed;
  for (const slug of Object.keys(previous.entries)) {
    if (!currentSlugs.has(slug)) changed.push(slug);
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
