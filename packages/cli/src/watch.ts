import { watch } from "chokidar";
import { precompute } from "@silicajs/core";

export type WatchOptions = {
  projectRoot: string;
  port?: number;
  onConfigChange?: () => void | Promise<void>;
};

export function watchContent({
  projectRoot,
  port = 3000,
  onConfigChange,
}: WatchOptions) {
  const watcher = watch(["content/**/*", "themes/**/*", "silica.config.ts"], {
    cwd: projectRoot,
    ignoreInitial: true,
  });

  let pending: Promise<void> | undefined;
  watcher.on("all", (_event, filePath) => {
    pending ??= Promise.resolve()
      .then(async () => {
        if (requiresRestart(filePath)) {
          await onConfigChange?.();
          return;
        }
        await precompute({ projectRoot });
        await fetch(`http://localhost:${port}/__silica/revalidate?tag=build`, {
          method: "POST",
          headers: {
            "x-silica-revalidate-secret":
              process.env.SILICA_REVALIDATE_SECRET ?? "",
          },
        }).catch(() => undefined);
        console.log(`[silica] rebuilt content after ${filePath}`);
      })
      .finally(() => {
        pending = undefined;
      });
  });

  return watcher;
}

export function requiresRestart(filePath: string): boolean {
  return filePath === "silica.config.ts" || filePath.startsWith("themes/");
}

export function resolveDevPort(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.PORT);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
}
