import crypto from "node:crypto";
import { precompute } from "@silicajs/core";
import { reportBrokenWikilinks } from "./diagnostics.js";
import { loadProjectEnv } from "./env.js";
import { materializeNextApp } from "./materialize.js";
import { runNext, runStart, startNext } from "./next.js";
import { scaffoldProject } from "./scaffold.js";
import { resolveDevPort, watchContent } from "./watch.js";

export async function createCommand(directory: string): Promise<void> {
  await scaffoldProject(directory);
  console.log(`[silica] created ${directory}`);
}

export async function devCommand(): Promise<void> {
  const projectRoot = process.cwd();
  loadProjectEnv(projectRoot, "development");
  let shouldRestart = true;

  while (shouldRestart) {
    shouldRestart = false;
    process.env.SILICA_REVALIDATE_SECRET ??= crypto.randomUUID();
    const nextRoot = await materializeNextApp({ projectRoot });
    await precompute({ projectRoot });
    const { subprocess } = await startNext("dev", nextRoot);
    const watcher = watchContent({
      projectRoot,
      port: resolveDevPort(),
      onConfigChange: async () => {
        console.log("[silica] config or theme changed; restarting Next.js");
        shouldRestart = true;
        subprocess.kill("SIGTERM");
      },
    });

    try {
      await subprocess;
    } catch (error) {
      if (!shouldRestart) throw error;
    } finally {
      await watcher.close();
    }
  }
}

export async function buildCommand(): Promise<void> {
  const projectRoot = process.cwd();
  loadProjectEnv(projectRoot, "production");
  const nextRoot = await materializeNextApp({ projectRoot });
  const result = await precompute({ projectRoot });
  reportBrokenWikilinks(result.brokenLinks);
  await runNext("build", nextRoot);
}

export async function startCommand(): Promise<void> {
  const projectRoot = process.cwd();
  loadProjectEnv(projectRoot, "production");
  const nextRoot = await materializeNextApp({ projectRoot });
  await runStart(nextRoot);
}
