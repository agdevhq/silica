import type { ResolvedSilicaConfig } from "@silicajs/core/runtime";

export type RuntimeAuthConfig = {
  authEnabled: boolean;
  allowedDomains: string[];
  allowedEmails: string[];
};

export function resolveRuntimeAuthConfig(
  config: ResolvedSilicaConfig,
): RuntimeAuthConfig {
  const allowedDomains = uniqueList([
    ...(config.auth?.allowedDomains ?? []),
    ...parseList(process.env.SILICA_ALLOWED_DOMAINS),
  ]);
  const allowedEmails = uniqueList([
    ...(config.auth?.allowedEmails ?? []),
    ...parseList(process.env.SILICA_ALLOWED_EMAILS),
  ]);

  return {
    authEnabled:
      Boolean(config.auth) || process.env.SILICA_AUTH_ENABLED === "true",
    allowedDomains,
    allowedEmails,
  };
}

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function uniqueList(values: readonly string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}
