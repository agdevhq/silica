import path from "node:path";
import { createRequire } from "node:module";
import fs from "fs-extra";
import { loadConfig } from "@silicajs/core";
import {
  assistantModuleTemplate,
  assistantRouteTemplate,
  getSilicaTemplates,
  nextConfigTemplate,
  packageJsonTemplate,
  proxyTemplate,
  themeModuleTemplate,
  tsconfigTemplate,
} from "@silicajs/next";

export type MaterializeOptions = {
  projectRoot?: string;
};

export async function materializeNextApp(
  options: MaterializeOptions = {},
): Promise<string> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const nextRoot = path.join(projectRoot, ".silica/next");
  const publicRoot = path.join(nextRoot, "public");
  const config = await loadConfig(projectRoot);
  const configImport = await resolveUserConfigImport(projectRoot, nextRoot);

  await fs.ensureDir(nextRoot);
  await fs.remove(path.join(nextRoot, "app"));
  await fs.ensureDir(publicRoot);

  for (const template of getSilicaTemplates()) {
    const destination = path.join(nextRoot, template.path);
    await fs.ensureDir(path.dirname(destination));
    await fs.writeFile(destination, template.content);
  }

  await fs.writeFile(
    path.join(nextRoot, "next.config.ts"),
    nextConfigTemplate(configImport),
  );
  await fs.writeFile(path.join(nextRoot, "proxy.ts"), proxyTemplate(config));
  await fs.writeFile(
    path.join(nextRoot, "silica-theme.ts"),
    themeModuleTemplate(config.theme),
  );
  await fs.writeFile(
    path.join(nextRoot, "silica-assistant.ts"),
    assistantModuleTemplate(Boolean(config.ai)),
  );
  if (config.ai) {
    assertAssistantInstalled(projectRoot);
    const assistantRoutePath = path.join(
      nextRoot,
      "app/api/assistant/route.ts",
    );
    await fs.ensureDir(path.dirname(assistantRoutePath));
    await fs.writeFile(assistantRoutePath, assistantRouteTemplate(config.ai));
  }
  await fs.writeFile(
    path.join(nextRoot, "package.json"),
    packageJsonTemplate(),
  );
  await fs.writeFile(
    path.join(nextRoot, "tsconfig.json"),
    `${tsconfigTemplate(await fs.pathExists(path.join(projectRoot, "tsconfig.json")))}\n`,
  );
  await fs.writeFile(
    path.join(nextRoot, "next-env.d.ts"),
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
  await syncEnvFiles(projectRoot, nextRoot);
  await overlayPublic(projectRoot, publicRoot);
  return nextRoot;
}

function assertAssistantInstalled(projectRoot: string): void {
  const require = createRequire(path.join(projectRoot, "package.json"));
  try {
    require.resolve("@silicajs/assistant/package.json");
  } catch {
    throw new Error(
      "AI is enabled in silica.config.ts but @silicajs/assistant is not installed.\n" +
        "Install it together with the provider package for your configured model, e.g.:\n" +
        "  npm install @silicajs/assistant @core-ai/openai",
    );
  }
}

async function resolveUserConfigImport(
  projectRoot: string,
  nextRoot: string,
): Promise<string | undefined> {
  const configPath = await findUserConfig(projectRoot);
  if (!configPath) return undefined;

  const relativePath = path
    .relative(nextRoot, configPath)
    .split(path.sep)
    .join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

async function findUserConfig(
  projectRoot: string,
): Promise<string | undefined> {
  for (const filename of ["silica.config.ts", "silica.config.js"]) {
    const configPath = path.join(projectRoot, filename);
    if (await fs.pathExists(configPath)) return configPath;
  }
  return undefined;
}

async function syncEnvFiles(
  projectRoot: string,
  nextRoot: string,
): Promise<void> {
  const entries = await fs.readdir(projectRoot).catch(() => []);
  for (const entry of entries.filter(
    (name) => name === ".env" || name.startsWith(".env."),
  )) {
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

async function overlayPublic(
  projectRoot: string,
  publicRoot: string,
): Promise<void> {
  const sourceRoot = path.join(projectRoot, "public");
  if (!(await fs.pathExists(sourceRoot))) return;
  await fs.ensureDir(publicRoot);
  for (const entry of await fs.readdir(sourceRoot)) {
    if (entry === "silica") continue;
    const source = path.join(sourceRoot, entry);
    const destination = path.join(publicRoot, entry);
    await fs.remove(destination);
    try {
      await fs.symlink(
        source,
        destination,
        (await fs.stat(source)).isDirectory() ? "dir" : "file",
      );
    } catch {
      await fs.copy(source, destination);
    }
  }
}
