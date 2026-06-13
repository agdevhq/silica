import type { ChatModel } from "@core-ai/core-ai";
import type { ResolvedSilicaAssistantConfig } from "@silicajs/core/runtime";
import { AssistantUnavailableError } from "./handler.js";

export type AssistantProviderModule = Record<string, unknown>;

type ProviderFactory = (options: Record<string, unknown>) => {
  chatModel: (modelId: string) => ChatModel;
};

export function createChatModelFromConfig(
  assistant: ResolvedSilicaAssistantConfig,
  providerModule: AssistantProviderModule,
): ChatModel {
  const provider = assistant.provider;
  const factory = providerModule[provider.factory];

  if (typeof factory !== "function") {
    throw new AssistantUnavailableError(
      `The AI assistant provider ${provider.package} does not export ${provider.factory}.`,
    );
  }

  const providerInstance = (factory as ProviderFactory)({
    ...resolveEnv(provider.env),
    ...(provider.options ?? {}),
    ...resolveSecrets(provider.secrets),
  });

  if (typeof providerInstance?.chatModel !== "function") {
    throw new AssistantUnavailableError(
      `The AI assistant provider ${provider.package} factory ${provider.factory} did not return a chat model provider.`,
    );
  }

  return providerInstance.chatModel(assistant.model);
}

function resolveEnv(
  env: Record<string, string> | undefined,
): Record<string, string> {
  if (!env) return {};
  return resolveEnvMap(env);
}

function resolveSecrets(
  secrets: Record<string, string> | undefined,
): Record<string, string> {
  if (!secrets) return {};
  return resolveEnvMap(secrets);
}

function resolveEnvMap(env: Record<string, string>): Record<string, string> {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const [argumentName, envVarName] of Object.entries(env)) {
    const value = process.env[envVarName];
    if (value) {
      values[argumentName] = value;
    } else {
      missing.push(envVarName);
    }
  }

  if (missing.length > 0) {
    throw new AssistantUnavailableError(
      `The AI assistant is not configured: set ${missing.join(", ")}.`,
    );
  }

  return values;
}
