import { precompute } from "@silicajs/core";
import { materializeNextApp } from "./materialize.js";
import { runNext } from "./next.js";
import { scaffoldProject } from "./scaffold.js";
import { watchContent } from "./watch.js";

export async function createCommand(directory: string): Promise<void> {
  await scaffoldProject(directory);
  console.log(`[silica] created ${directory}`);
}

export async function devCommand(): Promise<void> {
  const projectRoot = process.cwd();
  const nextRoot = await materializeNextApp({ projectRoot });
  await precompute({ projectRoot });
  watchContent({ projectRoot });
  await runNext("dev", nextRoot);
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
  await runNext("start", nextRoot);
}

function reportBrokenLinks(links: Array<{ source: string; target: string }>): void {
  if (links.length === 0) return;
  console.warn("[silica] broken wikilinks:");
  for (const link of links) {
    console.warn(`  ${link.source} -> ${link.target}`);
  }
}
