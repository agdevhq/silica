import path from "node:path";
import fs from "fs-extra";
import { getSilicaTemplates, nextConfigTemplate, packageJsonTemplate, tsconfigTemplate } from "@silicajs/next";

export type MaterializeOptions = {
  projectRoot?: string;
};

export async function materializeNextApp(options: MaterializeOptions = {}): Promise<string> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const nextRoot = path.join(projectRoot, ".silica/next");
  const publicRoot = path.join(nextRoot, "public");

  await fs.ensureDir(nextRoot);
  await fs.remove(path.join(nextRoot, "app"));
  await fs.ensureDir(publicRoot);

  for (const template of getSilicaTemplates()) {
    const destination = path.join(nextRoot, template.path);
    await fs.ensureDir(path.dirname(destination));
    await fs.writeFile(destination, template.content);
  }

  await fs.writeFile(path.join(nextRoot, "next.config.ts"), nextConfigTemplate());
  await fs.writeFile(path.join(nextRoot, "package.json"), packageJsonTemplate());
  await fs.writeFile(path.join(nextRoot, "tsconfig.json"), `${tsconfigTemplate(await fs.pathExists(path.join(projectRoot, "tsconfig.json")))}\n`);
  await fs.writeFile(path.join(nextRoot, "next-env.d.ts"), '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
  await syncEnvFiles(projectRoot, nextRoot);
  await overlayPublic(projectRoot, publicRoot);
  return nextRoot;
}

async function syncEnvFiles(projectRoot: string, nextRoot: string): Promise<void> {
  const entries = await fs.readdir(projectRoot).catch(() => []);
  for (const entry of entries.filter((name) => name === ".env" || name.startsWith(".env."))) {
    const source = path.join(projectRoot, entry);
    const destination = path.join(nextRoot, entry);
    await fs.remove(destination);
    try {
      await fs.symlink(source, destination);
    } catch {
      await fs.copyFile(source, destination);
    }
  }
}

async function overlayPublic(projectRoot: string, publicRoot: string): Promise<void> {
  const sourceRoot = path.join(projectRoot, "public");
  if (!(await fs.pathExists(sourceRoot))) return;
  await fs.ensureDir(publicRoot);
  for (const entry of await fs.readdir(sourceRoot)) {
    if (entry === "silica") continue;
    const source = path.join(sourceRoot, entry);
    const destination = path.join(publicRoot, entry);
    await fs.remove(destination);
    try {
      await fs.symlink(source, destination, (await fs.stat(source)).isDirectory() ? "dir" : "file");
    } catch {
      await fs.copy(source, destination);
    }
  }
}
