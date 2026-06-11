import fs from "node:fs";
import path from "node:path";
import type { ChatModel } from "@core-ai/core-ai";
import {
  slugToHref,
  type ResolvedSilicaAiConfig,
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
  createAssistantHandler,
  type AssistantRequestContext,
  type AssistantRuntime,
} from "./server/index.js";
import type { AssistantSiteContext } from "./types.js";

const ASSISTANT_SECRET_ENV = "SILICA_ASSISTANT_SECRET";
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const MAX_HOME_PAGE_EXCERPT_CHARS = 2_000;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export type CreateChatModelOptions = {
  provider: ResolvedSilicaAiConfig["provider"];
  model: string;
  apiKey: string;
};

export type AssistantRateLimitOptions = {
  /** Maximum assistant requests allowed per client in the configured window. */
  maxRequests?: number;
  /** Window size in milliseconds. Defaults to one minute. */
  windowMs?: number;
};

export type AssistantRouteOptions = {
  /**
   * Instantiates the configured chat model. The generated assistant route
   * wires this to the provider package matching `silica.config.ts`.
   */
  createChatModel: (options: CreateChatModelOptions) => ChatModel;
  /**
   * Basic per-client request cap for public assistant routes. Pass `false`
   * only when another guard, such as Silica auth, protects this endpoint.
   */
  rateLimit?: AssistantRateLimitOptions | false;
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
    authorizeRequest:
      options.rateLimit === false
        ? undefined
        : createRateLimitGuard(options.rateLimit),
    resolve: (requestContext): AssistantRuntime => {
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
        site: loadSiteContext(config, requestContext),
        transcriptSigningSecret,
      };
    },
  });
}

function createRateLimitGuard(
  options: AssistantRateLimitOptions | undefined,
): (request: Request) => Response | undefined {
  const maxRequests = Math.max(
    1,
    options?.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  );
  const windowMs = Math.max(
    1,
    options?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
  );

  return (request) => {
    const now = Date.now();
    const key = rateLimitKey(request);
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      pruneExpiredBuckets(now);
      return undefined;
    }

    bucket.count += 1;
    if (bucket.count <= maxRequests) return undefined;

    return Response.json(
      { error: "Too many assistant requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      },
    );
  };
}

function rateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedClient = forwardedFor?.split(",")[0]?.trim();
  return (
    forwardedClient ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anonymous"
  );
}

function pruneExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size <= MAX_RATE_LIMIT_BUCKETS) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function loadSiteContext(
  config: ResolvedSilicaConfig,
  requestContext: AssistantRequestContext,
): AssistantSiteContext {
  const contentRoot = path.join(getProjectRoot(), ".silica/content");
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
