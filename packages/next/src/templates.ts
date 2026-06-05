import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedSilicaConfig } from "@silicajs/core/runtime";

export type TemplateFile = {
  path: string;
  content: string;
};

const templateFilesRoot = fileURLToPath(
  new URL("./template-files", import.meta.url),
);

export function getSilicaTemplates(): TemplateFile[] {
  return readTemplateDirectory(path.join(templateFilesRoot, "generated-app"));
}

export function nextConfigTemplate(): string {
  return readTemplateFile("next.config.ts");
}

export function themeModuleTemplate(themeValue: unknown): string {
  return readTemplateFile("silica-theme.ts").replace(
    '"{{themeSpecifier}}"',
    JSON.stringify(resolveThemeSpecifier(themeValue)),
  );
}

export function proxyTemplate(config: ResolvedSilicaConfig): string {
  return `import type { NextRequest } from "next/server";
import { silicaProxy } from "@silicajs/next/proxy";

const silicaProxyConfig = ${JSON.stringify(
    {
      authEnabled: Boolean(config.auth),
      allowedDomains: config.auth?.allowedDomains ?? [],
      allowedEmails: config.auth?.allowedEmails ?? [],
      publicPaths: config.logo ? [config.logo] : [],
    },
    null,
    2,
  )} as const;

export function proxy(request: NextRequest) {
  return silicaProxy(request, silicaProxyConfig);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
`;
}

export function tsconfigTemplate(hasUserTsconfig: boolean): string {
  const template = readTemplateFile("tsconfig.json");
  const rendered = hasUserTsconfig
    ? template.replaceAll("{{extends}}", "../../tsconfig.json")
    : template.replace('  "extends": "{{extends}}",\n', "");
  return rendered.trimEnd();
}

export function packageJsonTemplate(): string {
  return readTemplateFile("package.json");
}

function readTemplateFile(filename: string): string {
  return fs.readFileSync(path.join(templateFilesRoot, filename), "utf8");
}

function resolveThemeSpecifier(themeValue: unknown): string {
  const themeName =
    typeof themeValue === "object" &&
    themeValue !== null &&
    "name" in themeValue
      ? String((themeValue as { name?: string }).name ?? "default")
      : typeof themeValue === "string"
        ? themeValue
        : "default";

  if (!themeName || themeName === "default") return "@silicajs/theme-amethyst";
  if (themeName.startsWith("."))
    return `../../${themeName.replace(/^\.\//, "")}`;
  return themeName;
}

function readTemplateDirectory(root: string, current = root): TemplateFile[] {
  const entries = fs
    .readdirSync(current, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  return entries.flatMap((entry) => {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) return readTemplateDirectory(root, absolutePath);
    if (!entry.isFile()) return [];

    return {
      path: path.relative(root, absolutePath).split(path.sep).join("/"),
      content: fs.readFileSync(absolutePath, "utf8"),
    };
  });
}
