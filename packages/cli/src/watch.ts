import { watch } from "chokidar";
import { precompute } from "@silicajs/core";

export type WatchOptions = {
  projectRoot: string;
  port?: number;
  onConfigChange?: () => void | Promise<void>;
};

export function watchContent({ projectRoot, port = 3000, onConfigChange }: WatchOptions) {
  const watcher = watch(["content/**/*", "silica.config.ts"], {
    cwd: projectRoot,
    ignoreInitial: true,
  });

  let pending: Promise<void> | undefined;
  watcher.on("all", (_event, filePath) => {
    pending ??= Promise.resolve()
      .then(async () => {
        if (filePath === "silica.config.ts") {
          await onConfigChange?.();
          return;
        }
        await precompute({ projectRoot });
        await fetch(`http://localhost:${port}/__silica/revalidate?tag=build`, { method: "POST" }).catch(() => undefined);
        console.log(`[silica] rebuilt content after ${filePath}`);
      })
      .finally(() => {
        pending = undefined;
      });
  });

  return watcher;
}
