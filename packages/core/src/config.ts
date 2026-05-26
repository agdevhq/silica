import path from "node:path";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import type { ResolvedSilicaConfig, SilicaConfig } from "./types.js";

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
    wikilinks: {
      strategy: config.wikilinks?.strategy ?? "shortest",
      strict: config.wikilinks?.strict ?? false,
    },
    filters: {
      removeDrafts: config.filters?.removeDrafts ?? true,
      explicitPublish: config.filters?.explicitPublish ?? false,
    },
  };
}
