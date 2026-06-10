import path from "node:path";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import { resolvePublicAssetPath } from "./logo.js";
import type {
  ResolvedSilicaAiConfig,
  ResolvedSilicaConfig,
  ResolvedSilicaPrerenderConfig,
  SilicaAiConfig,
  SilicaConfig,
  SilicaPrerenderConfig,
} from "./types.js";

const DEFAULT_API_KEY_ENV_BY_PROVIDER: Record<
  ResolvedSilicaAiConfig["provider"],
  string
> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

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
    ai: resolveAiConfig(config.ai),
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

function resolveAiConfig(
  ai: SilicaAiConfig | false | undefined,
): ResolvedSilicaAiConfig | undefined {
  if (!ai || ai.enabled === false) return undefined;

  const apiKeyEnv = DEFAULT_API_KEY_ENV_BY_PROVIDER[ai.provider];
  if (!apiKeyEnv) {
    throw new Error(
      `Unknown Silica AI provider "${String(ai.provider)}". ` +
        "Expected one of: openai, anthropic, google, mistral.",
    );
  }
  if (!ai.model) {
    throw new Error(
      "Silica AI requires a model (e.g. ai: { provider: 'openai', model: 'gpt-5.2' }).",
    );
  }

  return {
    provider: ai.provider,
    model: ai.model,
    apiKeyEnv: ai.apiKeyEnv ?? apiKeyEnv,
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
