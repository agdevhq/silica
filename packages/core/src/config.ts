import path from "node:path";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import { resolveAssistantProvider } from "./assistant-providers.js";
import { resolvePublicAssetPath } from "./logo.js";
import type {
  ResolvedSilicaAssistantConfig,
  ResolvedSilicaConfig,
  ResolvedSilicaPrerenderConfig,
  SilicaAssistantConfig,
  SilicaConfig,
  SilicaPrerenderConfig,
} from "./types.js";

export function defineConfig(config: SilicaConfig): SilicaConfig {
  return config;
}

export async function loadConfig(
  projectRoot = process.cwd(),
): Promise<ResolvedSilicaConfig> {
  const configPath = path.join(projectRoot, "silica.config.ts");
  const jsConfigPath = path.join(projectRoot, "silica.config.js");
  const configFile = existsSync(configPath)
    ? configPath
    : existsSync(jsConfigPath)
      ? jsConfigPath
      : undefined;

  let userConfig: SilicaConfig = {};
  if (configFile) {
    const jiti = createJiti(projectRoot, { interopDefault: true });
    const loaded = await jiti.import<SilicaConfig | { default: SilicaConfig }>(
      configFile,
    );
    userConfig = "default" in loaded ? loaded.default : loaded;
  }

  return resolveConfig(userConfig, projectRoot);
}

export function resolveConfig(
  config: SilicaConfig = {},
  projectRoot = process.cwd(),
): ResolvedSilicaConfig {
  const auth = config.auth === false ? undefined : config.auth;
  const authEnabled = Boolean(
    auth?.enabled ??
    auth?.provider ??
    auth?.allowedDomains?.length ??
    auth?.allowedEmails?.length,
  );
  const allowedDomains = auth?.allowedDomains ?? [];
  const allowedEmails = auth?.allowedEmails ?? [];

  if (
    authEnabled &&
    allowedDomains.length === 0 &&
    allowedEmails.length === 0
  ) {
    throw new Error(
      "Silica auth requires at least one allowedDomains or allowedEmails entry.",
    );
  }

  return {
    projectRoot,
    title: config.title ?? "Silica",
    description: config.description ?? "A Silica knowledge site",
    logo: resolvePublicAssetPath(config.logo),
    baseUrl: config.baseUrl,
    contentDir: config.contentDir ?? "content",
    theme: config.theme ?? "default",
    auth: authEnabled
      ? {
          provider: auth?.provider ?? "google",
          enabled: true,
          allowedDomains,
          allowedEmails,
        }
      : undefined,
    assistant: resolveAssistantConfig(config.assistant),
    wikilinks: {
      strategy: config.wikilinks?.strategy ?? "shortest",
      strict: config.wikilinks?.strict ?? false,
    },
    tags: {
      inline: config.tags?.inline ?? true,
    },
    ordering: {
      numericPrefixes: config.ordering?.numericPrefixes ?? true,
    },
    filters: {
      removeDrafts: config.filters?.removeDrafts ?? true,
      explicitPublish: config.filters?.explicitPublish ?? false,
    },
    render: {
      prerender: resolvePrerenderConfig(config.render?.prerender),
      cache: {
        storage: config.render?.cache?.storage ?? "filesystem",
        directory: config.render?.cache?.directory,
      },
    },
  };
}

function resolveAssistantConfig(
  assistant: SilicaAssistantConfig | false | undefined,
): ResolvedSilicaAssistantConfig | undefined {
  if (!assistant || assistant.enabled === false) return undefined;

  if (!assistant.model) {
    throw new Error(
      "Silica assistant requires a model (e.g. assistant: { provider: 'openai', model: 'gpt-5.2' }).",
    );
  }

  return {
    provider: resolveAssistantProvider(assistant.provider),
    model: assistant.model,
    ...(assistant.rateLimit !== undefined
      ? { rateLimit: assistant.rateLimit }
      : {}),
  };
}

function resolvePrerenderConfig(
  prerender: SilicaPrerenderConfig | undefined,
): ResolvedSilicaPrerenderConfig {
  if (!prerender || prerender === "all") return { strategy: "all" };
  if (prerender === "none") return { strategy: "none" };
  if ("strategy" in prerender && prerender.strategy === "all") {
    return { ...prerender, strategy: "all" };
  }
  if ("strategy" in prerender && prerender.strategy === "none") {
    return { ...prerender, strategy: "none" };
  }
  if ("strategy" in prerender && prerender.strategy === "custom") {
    return { ...prerender, strategy: "custom" };
  }
  return { ...prerender, strategy: "depth" };
}
