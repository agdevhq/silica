import type {
  SilicaAssistantProviderConfig,
  SilicaAssistantProviderInput,
  SilicaAssistantProviderPresetConfig,
} from "./types.js";

type AssistantProviderPresetDefinition = SilicaAssistantProviderConfig & {
  requiredOptions?: readonly string[];
};

export const ASSISTANT_PROVIDER_PRESETS = {
  openai: {
    package: "@core-ai/openai",
    factory: "createOpenAI",
    secrets: { apiKey: "OPENAI_API_KEY" },
  },
  anthropic: {
    package: "@core-ai/anthropic",
    factory: "createAnthropic",
    secrets: { apiKey: "ANTHROPIC_API_KEY" },
  },
  google: {
    package: "@core-ai/google-genai",
    factory: "createGoogleGenAI",
    secrets: { apiKey: "GOOGLE_API_KEY" },
  },
  mistral: {
    package: "@core-ai/mistral",
    factory: "createMistral",
    secrets: { apiKey: "MISTRAL_API_KEY" },
  },
  omnifact: {
    package: "@core-ai/omnifact",
    factory: "createOmnifact",
    secrets: { apiKey: "OMNIFACT_API_KEY" },
  },
  "azure-openai": {
    package: "@core-ai/azure-openai",
    factory: "createAzureOpenAI",
    env: { endpoint: "AZURE_OPENAI_ENDPOINT" },
    secrets: { apiKey: "AZURE_OPENAI_API_KEY" },
    requiredOptions: ["endpoint"],
  },
} as const satisfies Record<string, AssistantProviderPresetDefinition>;

export type SilicaAssistantProviderPreset =
  keyof typeof ASSISTANT_PROVIDER_PRESETS;

export function resolveAssistantProvider(
  provider: SilicaAssistantProviderInput,
): SilicaAssistantProviderConfig {
  if (typeof provider === "string") {
    return resolvePreset(provider, undefined);
  }

  if (isPresetConfig(provider)) {
    return resolvePreset(provider.preset, provider.options);
  }

  return validateManualProvider(provider);
}

function resolvePreset(
  preset: string,
  options: Record<string, unknown> | undefined,
): SilicaAssistantProviderConfig {
  if (!isAssistantProviderPreset(preset)) {
    throw new Error(
      `Unknown Silica assistant provider "${preset}". ` +
        `Expected one of: ${Object.keys(ASSISTANT_PROVIDER_PRESETS).join(", ")}.`,
    );
  }

  const definition: AssistantProviderPresetDefinition =
    ASSISTANT_PROVIDER_PRESETS[preset];
  const resolvedOptions = cloneOptions(options);
  for (const optionName of definition.requiredOptions ?? []) {
    if (
      (!resolvedOptions || !(optionName in resolvedOptions)) &&
      !definition.env?.[optionName]
    ) {
      throw new Error(
        `Silica assistant provider "${preset}" requires provider.options.${optionName}.`,
      );
    }
  }

  return stripPresetMetadata({
    ...definition,
    ...(resolvedOptions ? { options: resolvedOptions } : {}),
  });
}

function validateManualProvider(
  provider: SilicaAssistantProviderConfig,
): SilicaAssistantProviderConfig {
  const packageName = nonEmptyString(provider.package, "provider.package");
  const factory = nonEmptyString(provider.factory, "provider.factory");
  const env = validateEnv(provider.env);
  const secrets = validateSecrets(provider.secrets);
  const options = cloneOptions(provider.options);

  return {
    package: packageName,
    factory,
    ...(env ? { env } : {}),
    ...(secrets ? { secrets } : {}),
    ...(options ? { options } : {}),
  };
}

function isPresetConfig(
  provider: SilicaAssistantProviderConfig | SilicaAssistantProviderPresetConfig,
): provider is SilicaAssistantProviderPresetConfig {
  return "preset" in provider;
}

function isAssistantProviderPreset(
  provider: string,
): provider is SilicaAssistantProviderPreset {
  return provider in ASSISTANT_PROVIDER_PRESETS;
}

function stripPresetMetadata(
  definition: AssistantProviderPresetDefinition,
): SilicaAssistantProviderConfig {
  const { requiredOptions: _requiredOptions, ...provider } = definition;
  return {
    package: provider.package,
    factory: provider.factory,
    ...(provider.env ? { env: { ...provider.env } } : {}),
    ...(provider.secrets ? { secrets: { ...provider.secrets } } : {}),
    ...(provider.options ? { options: cloneOptions(provider.options) } : {}),
  };
}

function validateSecrets(
  secrets: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (secrets === undefined) return undefined;
  if (!isPlainObject(secrets)) {
    throw new Error("Silica assistant provider.secrets must be an object.");
  }

  const entries = Object.entries(secrets).map(([key, value]) => [
    nonEmptyString(key, "provider.secrets key"),
    nonEmptyString(value, `provider.secrets.${key}`),
  ]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function validateEnv(
  env: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (env === undefined) return undefined;
  if (!isPlainObject(env)) {
    throw new Error("Silica assistant provider.env must be an object.");
  }

  const entries = Object.entries(env).map(([key, value]) => [
    nonEmptyString(key, "provider.env key"),
    nonEmptyString(value, `provider.env.${key}`),
  ]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function cloneOptions(
  options: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (options === undefined) return undefined;
  assertJsonSerializable(options, "provider.options");
  return JSON.parse(JSON.stringify(options)) as Record<string, unknown>;
}

function assertJsonSerializable(value: unknown, path: string): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`Silica assistant ${path} must be JSON-serializable.`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item === undefined) {
        throw new Error(
          `Silica assistant ${path}[${index}] cannot be undefined.`,
        );
      }
      assertJsonSerializable(item, `${path}[${index}]`);
    });
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) {
        throw new Error(`Silica assistant ${path}.${key} cannot be undefined.`);
      }
      assertJsonSerializable(item, `${path}.${key}`);
    }
    return;
  }

  throw new Error(`Silica assistant ${path} must be JSON-serializable.`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonEmptyString(value: string, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Silica assistant ${path} must be a non-empty string.`);
  }
  return value;
}
