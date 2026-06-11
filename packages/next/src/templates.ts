import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ResolvedSilicaAiConfig,
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
      "/* __SILICA_CONFIG_OVERRIDE__ */",
      nextConfigOverride(userConfigImport),
    );
}

export function themeModuleTemplate(themeValue: unknown): string {
  return readTemplateFile("silica-theme.ts").replace(
    '"{{themeSpecifier}}"',
    JSON.stringify(resolveThemeSpecifier(themeValue)),
  );
}

export function assistantModuleTemplate(aiEnabled: boolean): string {
  if (!aiEnabled) {
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

const ASSISTANT_PROVIDER_IMPORTS: Record<
  ResolvedSilicaAiConfig["provider"],
  { packageName: string; factory: string }
> = {
  openai: { packageName: "@core-ai/openai", factory: "createOpenAI" },
  anthropic: { packageName: "@core-ai/anthropic", factory: "createAnthropic" },
  google: {
    packageName: "@core-ai/google-genai",
    factory: "createGoogleGenAI",
  },
  mistral: { packageName: "@core-ai/mistral", factory: "createMistral" },
};

export type AssistantRouteTemplateOptions = {
  authEnabled?: boolean;
};

export function assistantProviderPackageName(
  provider: ResolvedSilicaAiConfig["provider"],
): string {
  return ASSISTANT_PROVIDER_IMPORTS[provider].packageName;
}

export function assistantRouteTemplate(
  ai: ResolvedSilicaAiConfig,
  options: AssistantRouteTemplateOptions = {},
): string {
  const provider = ASSISTANT_PROVIDER_IMPORTS[ai.provider];
  const rateLimit = options.authEnabled
    ? "false"
    : "{ maxRequests: 10, windowMs: 60_000 }";
  return `import { ${provider.factory} } from "${provider.packageName}";
import { createAssistantRouteHandler } from "@silicajs/assistant/next";

export const POST = createAssistantRouteHandler({
  rateLimit: ${rateLimit},
  createChatModel: ({ apiKey, model }) =>
    ${provider.factory}({ apiKey }).chatModel(model),
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

export function packageJsonTemplate(): string {
  return readTemplateFile("package.json");
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
