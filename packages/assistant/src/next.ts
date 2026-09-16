import fs from "node:fs";
import path from "node:path";
import type { ChatModel } from "@core-ai/core-ai";
import {
  slugToHref,
  type ResolvedSilicaAssistantConfig,
  type ResolvedSilicaConfig,
} from "@silicajs/core/runtime";
import {
  getConfig,
  getPage,
  getPageBySourcePath,
  getProjectRoot,
  resolveWikiLinkFromDb,
} from "@silicajs/next/server-data";
import {
  AssistantUnavailableError,
  type AssistantProviderModule,
  createChatModelFromConfig,
  createAssistantHandler,
  type AssistantRequestContext,
  type AssistantRuntime,
} from "./server/index.js";
import {
  createRateLimitGuard,
  type AssistantRateLimitOptions,
} from "./server/rate-limit.js";
import type { AssistantSiteContext } from "./types.js";

const ASSISTANT_SECRET_ENV = "SILICA_ASSISTANT_SECRET";
const MAX_HOME_PAGE_EXCERPT_CHARS = 2_000;

export type CreateChatModelOptions = {
  assistant: ResolvedSilicaAssistantConfig;
};

export type { AssistantRateLimitOptions } from "./server/rate-limit.js";

export type AssistantRouteOptions = {
  /**
   * Provider package module imported by the generated route. Keeping this
   * import static lets Next trace and bundle optional provider packages.
   */
  providerModule?: AssistantProviderModule;
  /**
   * Instantiates the configured chat model. Defaults to resolving the factory
   * from `providerModule` and the resolved Silica assistant config.
   */
  createChatModel?: (
    options: CreateChatModelOptions,
  ) => ChatModel | Promise<ChatModel>;
  /**
   * Basic per-client request cap for assistant routes. Pass `false` only when
   * another quota guard protects this endpoint.
   */
  rateLimit?: AssistantRateLimitOptions | false;
};

/**
 * `POST` handler for the generated `/api/assistant` route. Reads the AI
 * configuration and generated runtime content from the Silica build output
 * and answers with a streamed, cited response.
 */
export function createAssistantRouteHandler(
  options: AssistantRouteOptions = {},
): (request: Request) => Promise<Response> {
  return createAssistantHandler({
    authorizeRequest: async (request) => {
      const assistantRateLimit =
        options.rateLimit !== undefined
          ? options.rateLimit
          : getConfig().assistant?.rateLimit;
      if (assistantRateLimit === false) return undefined;
      return createRateLimitGuard(assistantRateLimit)(request);
    },
    resolve: async (requestContext): Promise<AssistantRuntime> => {
      const config = getConfig();
      const assistant = config.assistant;
      if (!assistant) {
        throw new AssistantUnavailableError(
          "The AI assistant is not enabled for this site.",
        );
      }

      const transcriptSigningSecret = process.env[ASSISTANT_SECRET_ENV];
      if (!transcriptSigningSecret) {
        throw new AssistantUnavailableError(
          `The AI assistant is not configured: set the ${ASSISTANT_SECRET_ENV} environment variable.`,
        );
      }
      const createChatModel =
        options.createChatModel ??
        ((modelOptions: CreateChatModelOptions) => {
          if (!options.providerModule) {
            throw new AssistantUnavailableError(
              "The AI assistant provider module is not configured.",
            );
          }
          return createChatModelFromConfig(
            modelOptions.assistant,
            options.providerModule,
          );
        });

      return {
        model: await createChatModel({ assistant }),
        site: loadAssistantSiteContext(config, requestContext),
        transcriptSigningSecret,
      };
    },
  });
}

/**
 * Builds the assistant site context from the generated Silica runtime data,
 * optionally focused on the page the request originated from.
 */
export function loadAssistantSiteContext(
  config: ResolvedSilicaConfig,
  requestContext: AssistantRequestContext,
): AssistantSiteContext {
  const contentRoot = path.join(getProjectRoot(), "data/content");
  const homePage = loadHomePageContext(contentRoot);
  const currentPage = loadCurrentPageContext(
    contentRoot,
    requestContext,
    homePage?.sourcePath,
  );
  return {
    siteTitle: config.title,
    siteDescription: config.description,
    homePage,
    currentPage,
    contentRoot,
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
    resolveWikiLink: (currentSourcePath, target) => {
      const currentEntry =
        getPageBySourcePath(currentSourcePath) ??
        (homePage ? getPageBySourcePath(homePage.sourcePath) : undefined) ??
        getPage("index");
      if (!currentEntry) return undefined;

      const resolvedSlug = resolveWikiLinkFromDb(
        currentEntry.slug,
        target,
        config.wikilinks.strategy,
        config.ordering,
      );
      if (!resolvedSlug) return undefined;

      const entry = getPage(resolvedSlug);
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

function loadHomePageContext(
  contentRoot: string,
): AssistantSiteContext["homePage"] {
  const homePage = getPage("index");
  if (!homePage) return undefined;

  try {
    const raw = fs.readFileSync(path.join(contentRoot, homePage.sourcePath), {
      encoding: "utf8",
    });
    const excerpt = truncateHomePageExcerpt(stripFrontmatter(raw).trim());
    if (!excerpt) return undefined;
    return {
      title: homePage.title,
      sourcePath: homePage.sourcePath,
      excerpt,
    };
  } catch {
    return undefined;
  }
}

function loadCurrentPageContext(
  contentRoot: string,
  requestContext: AssistantRequestContext,
  fallbackSourcePath: string | undefined,
): AssistantSiteContext["currentPage"] {
  const sourcePath =
    requestContext.currentSourcePath ??
    sourcePathForSlug(requestContext.currentSlug) ??
    fallbackSourcePath;
  if (!sourcePath) return undefined;

  const entry = getPageBySourcePath(sourcePath);
  if (!entry) return undefined;

  try {
    const raw = fs.readFileSync(path.join(contentRoot, entry.sourcePath), {
      encoding: "utf8",
    });
    const excerpt = truncateHomePageExcerpt(stripFrontmatter(raw).trim());
    return {
      title: entry.title,
      slug: entry.slug,
      sourcePath: entry.sourcePath,
      excerpt,
    };
  } catch {
    return undefined;
  }
}

function sourcePathForSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return getPage(slug)?.sourcePath;
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function truncateHomePageExcerpt(markdown: string): string {
  const normalized = markdown.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_HOME_PAGE_EXCERPT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_HOME_PAGE_EXCERPT_CHARS).trimEnd()}...`;
}
