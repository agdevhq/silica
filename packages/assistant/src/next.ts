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
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_BUCKETS = 10_000;

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
