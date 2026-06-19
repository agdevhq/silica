import path from "node:path";
import { createRequire } from "node:module";
import { execa } from "execa";
import fs from "fs-extra";
import { loadConfig } from "@silicajs/core";
import {
  assistantModuleTemplate,
  assistantRouteTemplate,
  generatedAppPackageManifest,
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

type ProjectPackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type NpmPackEntry = {
  filename: string;
};

type GeneratedAppPackageDependencies = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export async function materializeNextApp(
  options: MaterializeOptions = {},
): Promise<string> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const nextRoot = path.join(projectRoot, ".silica/next");
  const publicRoot = path.join(nextRoot, "public");
  const config = await loadConfig(projectRoot);

  await fs.ensureDir(nextRoot);
  await fs.remove(path.join(nextRoot, "app"));
  await removeGeneratedInstallArtifacts(nextRoot);
  await fs.ensureDir(publicRoot);
  const configImport = await resolveUserConfigImport(projectRoot, nextRoot);

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
    assistantModuleTemplate(Boolean(config.assistant)),
  );
  if (config.assistant) {
    assertAssistantDependenciesInstalled(
      projectRoot,
      config.assistant.provider,
    );
    const assistantRoutePath = path.join(
      nextRoot,
      "app/api/assistant/route.ts",
    );
    await fs.ensureDir(path.dirname(assistantRoutePath));
    await fs.writeFile(
      assistantRoutePath,
      assistantRouteTemplate(config.assistant),
    );
  }
  await fs.writeFile(
    path.join(nextRoot, "package.json"),
    packageJsonTemplate(
      ...(await makeGeneratedAppDependencies(projectRoot, nextRoot, config)),
    ),
  );
  await fs.writeFile(
    path.join(nextRoot, "tsconfig.json"),
    `${tsconfigTemplate(false)}\n`,
  );
  await fs.writeFile(
    path.join(nextRoot, "next-env.d.ts"),
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
  await removeGeneratedEnvFiles(nextRoot);
  await overlayPublic(projectRoot, publicRoot);
  return nextRoot;
}

async function makeGeneratedAppDependencies(
  projectRoot: string,
  nextRoot: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
): Promise<
  [
    dependencies: GeneratedAppPackageDependencies["dependencies"],
    devDependencies: GeneratedAppPackageDependencies["devDependencies"],
  ]
> {
  const projectPackage = (await fs.readJson(
    path.join(projectRoot, "package.json"),
  )) as ProjectPackageJson;
  const packageVersions = collectPackageVersions(projectPackage);
  const dependencies: Record<string, string> = {
    ...generatedAppPackageManifest.dependencies,
  };
  const devDependencies: Record<string, string> = {
    ...generatedAppPackageManifest.devDependencies,
  };
  const localPackagesRoot = path.join(nextRoot, ".silica-packages");
  await fs.remove(localPackagesRoot);
  for (const [packageName, version] of Object.entries(dependencies)) {
    dependencies[packageName] = await resolveBakedDependency(
      projectRoot,
      nextRoot,
      localPackagesRoot,
      packageName,
      version,
    );
  }

  const themePackage = packageNameFromSpecifier(
    resolveThemePackageSpecifier(config.theme),
  );
  if (themePackage && !dependencies[themePackage]) {
    dependencies[themePackage] = await resolveProjectDependency(
      projectRoot,
      nextRoot,
      localPackagesRoot,
      packageVersions,
      themePackage,
    );
  }

  if (config.assistant) {
    dependencies["@silicajs/assistant"] = await resolveProjectDependency(
      projectRoot,
      nextRoot,
      localPackagesRoot,
      packageVersions,
      "@silicajs/assistant",
    );
    dependencies[config.assistant.provider.package] =
      await resolveProjectDependency(
        projectRoot,
        nextRoot,
        localPackagesRoot,
        packageVersions,
        config.assistant.provider.package,
      );
  }

  return [dependencies, devDependencies];
}

async function resolveBakedDependency(
  projectRoot: string,
  nextRoot: string,
  localPackagesRoot: string,
  packageName: string,
  version: string,
): Promise<string> {
  const packageRoot = resolveInstalledPackageRoot(projectRoot, packageName);
  return (
    (await packLocalDependency(nextRoot, localPackagesRoot, packageRoot)) ??
    version
  );
}

async function resolveProjectDependency(
  projectRoot: string,
  nextRoot: string,
  localPackagesRoot: string,
  packageVersions: Record<string, string>,
  packageName: string,
): Promise<string> {
  const version = packageVersions[packageName];
  if (!version) {
    throw new Error(
      `Generated app dependency ${packageName} is missing from package.json.\n` +
        `Add ${packageName} to the project dependencies before running silica build.`,
    );
  }
  return resolveBakedDependency(
    projectRoot,
    nextRoot,
    localPackagesRoot,
    packageName,
    version,
  );
}

async function packLocalDependency(
  nextRoot: string,
  localPackagesRoot: string,
  packageRoot: string | undefined,
): Promise<string | undefined> {
  if (!packageRoot || isNodeModulesPackage(packageRoot)) return undefined;

  await fs.ensureDir(localPackagesRoot);
  const { stdout } = await execa(
    "npm",
    ["pack", packageRoot, "--json", "--pack-destination", localPackagesRoot],
    { cwd: nextRoot },
  );
  const [entry] = JSON.parse(stdout) as NpmPackEntry[];
  if (!entry) return undefined;

  const tarballPath = path.isAbsolute(entry.filename)
    ? entry.filename
    : path.join(localPackagesRoot, entry.filename);
  return `file:${relativePosixPath(nextRoot, tarballPath)}`;
}

function resolveInstalledPackageRoot(
  projectRoot: string,
  packageName: string,
): string | undefined {
  const require = createRequire(path.join(projectRoot, "package.json"));
  for (const searchPath of require.resolve.paths(packageName) ?? []) {
    const packagePath = path.join(searchPath, packageName, "package.json");
    if (!fs.existsSync(packagePath)) continue;

    return fs.realpathSync(path.dirname(packagePath));
  }
  return undefined;
}

function isNodeModulesPackage(packageRoot: string): boolean {
  return packageRoot.split(path.sep).includes("node_modules");
}

function relativePosixPath(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

function collectPackageVersions(
  projectPackage: ProjectPackageJson,
): Record<string, string> {
  return {
    ...projectPackage.optionalDependencies,
    ...projectPackage.peerDependencies,
    ...projectPackage.devDependencies,
    ...projectPackage.dependencies,
  };
}

function resolveThemePackageSpecifier(themeValue: unknown): string {
  const themeName =
    typeof themeValue === "object" &&
    themeValue !== null &&
    "name" in themeValue
      ? String((themeValue as { name?: string }).name ?? "default")
      : typeof themeValue === "string"
        ? themeValue
        : "default";

  if (!themeName || themeName === "default") return "@silicajs/theme-amethyst";
  return themeName;
}

function packageNameFromSpecifier(specifier: string): string | undefined {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return undefined;
  const [first, second] = specifier.split("/");
  if (!first) return undefined;
  return first.startsWith("@") && second ? `${first}/${second}` : first;
}

function assertAssistantDependenciesInstalled(
  projectRoot: string,
  provider: { package: string },
): void {
  if (!isPackageInstalled(projectRoot, "@silicajs/assistant")) {
    throw new Error(
      "Assistant is enabled in silica.config.ts but @silicajs/assistant is not installed.\n" +
        "Install it together with the provider package for your configured model, e.g.:\n" +
        "  npm install @silicajs/assistant @core-ai/openai",
    );
  }

  if (!isPackageInstalled(projectRoot, provider.package)) {
    throw new Error(
      `Assistant is enabled in silica.config.ts but ${provider.package} is not installed.\n` +
        "Install it together with @silicajs/assistant for your configured model, e.g.:\n" +
        `  npm install @silicajs/assistant ${provider.package}`,
    );
  }
}

function isPackageInstalled(projectRoot: string, packageName: string): boolean {
  const require = createRequire(path.join(projectRoot, "package.json"));
  for (const searchPath of require.resolve.paths(packageName) ?? []) {
    if (fs.existsSync(path.join(searchPath, packageName, "package.json"))) {
      return true;
    }
  }
  return false;
}

async function resolveUserConfigImport(
  projectRoot: string,
  nextRoot: string,
): Promise<string | undefined> {
  const configPath = await findUserConfig(projectRoot);
  await removeGeneratedUserConfig(nextRoot);
  if (!configPath) return undefined;

  const relativePath = relativePosixPath(nextRoot, configPath);
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

async function removeGeneratedEnvFiles(nextRoot: string): Promise<void> {
  const entries = await fs.readdir(nextRoot).catch(() => []);
  await Promise.all(
    entries
      .filter(isEnvFile)
      .map((entry) => fs.remove(path.join(nextRoot, entry))),
  );
}

async function removeGeneratedInstallArtifacts(
  nextRoot: string,
): Promise<void> {
  await Promise.all([
    fs.remove(path.join(nextRoot, "node_modules")),
    fs.remove(path.join(nextRoot, "package-lock.json")),
    fs.remove(path.join(nextRoot, "npm-shrinkwrap.json")),
    fs.remove(path.join(nextRoot, "pnpm-lock.yaml")),
    fs.remove(path.join(nextRoot, "yarn.lock")),
  ]);
}

async function removeGeneratedUserConfig(nextRoot: string): Promise<void> {
  await Promise.all([
    fs.remove(path.join(nextRoot, "silica.user.config.ts")),
    fs.remove(path.join(nextRoot, "silica.user.config.js")),
  ]);
}

function isEnvFile(name: string): boolean {
  return name === ".env" || name.startsWith(".env.");
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
    await fs.copy(source, destination, { dereference: true });
  }
}
