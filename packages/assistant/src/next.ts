import path from "node:path";
import type { ChatModel } from "@core-ai/core-ai";
import {
  slugToHref,
  type ResolvedSilicaAiConfig,
} from "@silicajs/core/runtime";
import {
  getConfig,
  getPageBySourcePath,
  getProjectRoot,
} from "@silicajs/next/server-data";
import {
  AssistantUnavailableError,
  createAssistantHandler,
  type AssistantRuntime,
} from "./server/index.js";
import type { AssistantSiteContext } from "./types.js";

const ASSISTANT_SECRET_ENV = "SILICA_ASSISTANT_SECRET";

export type CreateChatModelOptions = {
  provider: ResolvedSilicaAiConfig["provider"];
  model: string;
  apiKey: string;
};

export type AssistantRouteOptions = {
  /**
   * Instantiates the configured chat model. The generated assistant route
   * wires this to the provider package matching `silica.config.ts`.
   */
  createChatModel: (options: CreateChatModelOptions) => ChatModel;
};

/**
 * `POST` handler for the generated `/api/assistant` route. Reads the AI
 * configuration and generated runtime content from the Silica build output
 * and answers with a streamed, cited response.
 */
export function createAssistantRouteHandler(
  options: AssistantRouteOptions,
): (request: Request) => Promise<Response> {
  return createAssistantHandler({
    resolve: (): AssistantRuntime => {
      const config = getConfig();
      const ai = config.ai;
      if (!ai) {
        throw new AssistantUnavailableError(
          "The AI assistant is not enabled for this site.",
        );
      }

      const apiKey = process.env[ai.apiKeyEnv];
      if (!apiKey) {
        throw new AssistantUnavailableError(
          `The AI assistant is not configured: set the ${ai.apiKeyEnv} environment variable.`,
        );
      }
      const transcriptSigningSecret = process.env[ASSISTANT_SECRET_ENV];
      if (!transcriptSigningSecret) {
        throw new AssistantUnavailableError(
          `The AI assistant is not configured: set the ${ASSISTANT_SECRET_ENV} environment variable.`,
        );
      }

      return {
        model: options.createChatModel({
          provider: ai.provider,
          model: ai.model,
          apiKey,
        }),
        site: loadSiteContext(config.title, config.description),
        transcriptSigningSecret,
      };
    },
  });
}

function loadSiteContext(
  siteTitle: string,
  siteDescription: string | undefined,
): AssistantSiteContext {
  return {
    siteTitle,
    siteDescription,
    contentRoot: path.join(getProjectRoot(), ".silica/content"),
    resolveCitation: (sourcePath) => {
      const entry = getPageBySourcePath(sourcePath);
      if (!entry) return undefined;
      return {
        slug: entry.slug,
        title: entry.title,
        href: slugToHref(entry.slug),
        sourcePath: entry.sourcePath,
      };
    },
  };
}
