import type { ChatModel } from "@core-ai/core-ai";
import type { ResolvedSilicaAiConfig } from "@silicajs/core/runtime";
import { getAllSlugs, getConfig, getPage } from "@silicajs/next/server-data";
import {
  AssistantUnavailableError,
  createAssistantHandler,
  type AssistantRuntime,
} from "./server/index.js";
import type { AssistantSiteContext } from "./types.js";

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
 * configuration and published pages from the Silica vault and answers
 * with a streamed, cited response.
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

      return {
        model: options.createChatModel({
          provider: ai.provider,
          model: ai.model,
          apiKey,
        }),
        site: loadSiteContext(config.title, config.description),
      };
    },
  });
}

function loadSiteContext(
  siteTitle: string,
  siteDescription: string | undefined,
): AssistantSiteContext {
  const pages = getAllSlugs().flatMap((slug) => {
    const entry = getPage(slug);
    if (!entry) return [];
    return [
      {
        slug: entry.slug,
        title: entry.title,
        sourcePath: entry.sourcePath,
        file: entry.file,
      },
    ];
  });

  return { siteTitle, siteDescription, pages };
}
