import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ResolvedSilicaAssistantConfig,
  ResolvedSilicaConfig,
} from "@silicajs/core/runtime";

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

export function nextConfigTemplate(userConfigImport?: string): string {
  const template = readTemplateFile("next.config.ts");
  return template
    .replace(
      "/* __SILICA_CONFIG_IMPORT__ */",
      userConfigImport ? `import { createJiti } from "jiti";` : "",
    )
    .replace(
      "const nextConfig = baseNextConfig;",
      nextConfigOverride(userConfigImport),
    );
}

export function themeModuleTemplate(themeValue: unknown): string {
  return readTemplateFile("silica-theme.ts").replace(
    '"{{themeSpecifier}}"',
    JSON.stringify(resolveThemeSpecifier(themeValue)),
  );
}

export function assistantModuleTemplate(assistantEnabled: boolean): string {
  if (!assistantEnabled) {
    return `import type { ThemeAssistantSlots } from "@silicajs/core/theme";

export const assistant: ThemeAssistantSlots | undefined = undefined;
`;
  }

  return `import {
  AssistantPanel,
  AssistantProvider,
  AssistantTrigger,
} from "@silicajs/assistant/ui";
import type { ThemeAssistantSlots } from "@silicajs/core/theme";

export const assistant: ThemeAssistantSlots | undefined = {
  Provider: AssistantProvider,
  Trigger: AssistantTrigger,
  Panel: AssistantPanel,
};
`;
}

export function assistantRouteTemplate(
  assistant: ResolvedSilicaAssistantConfig,
): string {
  return `import * as assistantProvider from ${JSON.stringify(assistant.provider.package)};
import { createAssistantRouteHandler } from "@silicajs/assistant/next";

export const POST = createAssistantRouteHandler({
  providerModule: assistantProvider,
});
`;
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

export function packageJsonTemplate(
  dependencies: Record<string, string> = {},
  devDependencies: Record<string, string> = {},
): string {
  return `${JSON.stringify(
    {
      private: true,
      name: ".silica-next",
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies,
      devDependencies,
    },
    null,
    2,
  )}\n`;
}

function readTemplateFile(filename: string): string {
  return fs.readFileSync(path.join(templateFilesRoot, filename), "utf8");
}

function nextConfigOverride(userConfigImport: string | undefined): string {
  if (!userConfigImport) return "const nextConfig = baseNextConfig;";

  return `type SilicaNextConfigOverride =
  | NextConfig
  | ((base: NextConfig) => NextConfig);

type SilicaUserConfig = {
  default?: { nextConfig?: SilicaNextConfigOverride };
  nextConfig?: SilicaNextConfigOverride;
};

const silicaUserConfig = loadSilicaUserConfig();
const silicaNextConfig = silicaUserConfig.nextConfig;

const nextConfig =
  typeof silicaNextConfig === "function"
    ? silicaNextConfig(baseNextConfig)
    : mergeNextConfig(baseNextConfig, silicaNextConfig);

function loadSilicaUserConfig(): { nextConfig?: SilicaNextConfigOverride } {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loaded = jiti(${JSON.stringify(userConfigImport)}) as SilicaUserConfig;
  return loaded.default ?? loaded;
}

function mergeNextConfig(
  base: NextConfig,
  override: NextConfig | undefined,
): NextConfig {
  if (!override) return base;
  return deepMerge(
    base as Record<string, unknown>,
    override as Record<string, unknown>,
  ) as NextConfig;
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    merged[key] =
      isPlainObject(baseValue) && isPlainObject(value)
        ? deepMerge(baseValue, value)
        : value;
  }
  return merged;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}`;
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
