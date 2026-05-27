import path from "node:path";
import { watch } from "chokidar";
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
        await precompute({ projectRoot });
        const response = await fetch(
          `http://localhost:${port}/api/silica/revalidate?tag=build`,
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
        console.log(`[silica] rebuilt content after ${filePath}`);
      })
      .finally(() => {
        pending = undefined;
      });
  });

  return watcher;
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
