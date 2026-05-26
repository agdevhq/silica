import { precompute } from "@silicajs/core";
import { materializeNextApp } from "./materialize.js";
import { runNext, runStart, startNext } from "./next.js";
import { scaffoldProject } from "./scaffold.js";
import { watchContent } from "./watch.js";

export async function createCommand(directory: string): Promise<void> {
  await scaffoldProject(directory);
  console.log(`[silica] created ${directory}`);
}

export async function devCommand(): Promise<void> {
  const projectRoot = process.cwd();
  let shouldRestart = true;

  while (shouldRestart) {
    shouldRestart = false;
    const nextRoot = await materializeNextApp({ projectRoot });
    await precompute({ projectRoot });
    const { subprocess } = await startNext("dev", nextRoot);
    const watcher = watchContent({
      projectRoot,
      onConfigChange: async () => {
        console.log("[silica] silica.config.ts changed; restarting Next.js");
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
  const nextRoot = await materializeNextApp({ projectRoot });
  const result = await precompute({ projectRoot });
  reportBrokenLinks(result.brokenLinks);
  await runNext("build", nextRoot);
}

export async function startCommand(): Promise<void> {
  const nextRoot = await materializeNextApp({ projectRoot: process.cwd() });
  await runStart(nextRoot);
}

function reportBrokenLinks(links: Array<{ source: string; target: string }>): void {
  if (links.length === 0) return;
  console.warn("[silica] broken wikilinks:");
  for (const link of links) {
    console.warn(`  ${link.source} -> ${link.target}`);
  }
}
