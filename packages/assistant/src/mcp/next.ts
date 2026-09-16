import fs from "node:fs";
import path from "node:path";
import {
  slugToHref,
  type ManifestEntry,
  type ResolvedSilicaAssistantMcpConfig,
  type ResolvedSilicaConfig,
} from "@silicajs/core/runtime";
import {
  getConfig,
  getNavigation,
  getPage,
  getPageBySourcePath,
  loadSearchIndex,
} from "@silicajs/next/server-data";
import { querySearchIndex } from "@silicajs/search";
import {
  loadAssistantSiteContext,
  type CreateChatModelOptions,
} from "../next.js";
import { AssistantUnavailableError } from "../server/index.js";
import { createRateLimitGuard } from "../server/rate-limit.js";
import type { AssistantSiteContext } from "../types.js";
import { createMcpApiKeyGuard } from "./api-key.js";
import { createMcpHandler, type McpRouteHandlers } from "./handler.js";
import type {
  McpPageContent,
  McpPageReference,
  McpPageSummary,
  McpSearchHit,
  McpSearchOptions,
  McpSiteSource,
} from "./source.js";

const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

export type McpRouteOptions = {
  /**
   * Per-API-key request cap. Defaults to the `assistant.mcp.rateLimit` config
   * or 60 requests per minute. Pass `false` only when another quota guard
   * protects this endpoint.
   */
  rateLimit?: ResolvedSilicaAssistantMcpConfig["rateLimit"];
  /** Accepted API keys. Defaults to the `SILICA_MCP_API_KEYS` environment variable. */
  apiKeys?: () => readonly string[];
};

/**
 * Handlers for the generated `/api/mcp` route. Authenticates with API keys,
 * rate limits per key, and serves the site's published markdown over MCP.
 */
export function createMcpRouteHandler(
  options: McpRouteOptions = {},
): McpRouteHandlers {
  const authorize = createMcpApiKeyGuard({ keys: options.apiKeys });

  return createMcpHandler({
    authorizeRequest: async (request) => {
      const mcp = getConfig().assistant?.mcp;
      if (!mcp) {
        return Response.json(
          { error: "The MCP server is not enabled for this site." },
          { status: 404 },
        );
      }

      const authorization = authorize(request);
      if (!authorization.ok) return authorization.response;

      const rateLimit =
        options.rateLimit !== undefined ? options.rateLimit : mcp.rateLimit;
      if (rateLimit === false) return undefined;
      return createRateLimitGuard({
        maxRequests: rateLimit?.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS,
        windowMs: rateLimit?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
        key: () => `mcp:${authorization.keyId}`,
      })(request);
    },
    resolve: () => {
      const config = getConfig();
      const assistant = config.assistant;
      if (!assistant?.mcp) {
        throw new AssistantUnavailableError(
          "The MCP server is not enabled for this site.",
        );
      }
      return { source: createNextMcpSource(config, assistant.mcp) };
    },
  });
}

function createNextMcpSource(
  config: ResolvedSilicaConfig,
  mcp: ResolvedSilicaAssistantMcpConfig,
): McpSiteSource {
  const site = loadAssistantSiteContext(config, {});
  return {
    site,
    tools: mcp.tools,
    listPages: () => listPages(),
    readPage: (reference) => readPage(site, reference),
    search: (query, searchOptions) => search(query, searchOptions),
  };
}

function listPages(): McpPageSummary[] {
  return getNavigation().entries.map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    href: slugToHref(entry.slug),
  }));
}

function readPage(
  site: AssistantSiteContext,
  reference: McpPageReference,
): McpPageContent | undefined {
  const entry = resolveEntry(reference);
  if (!entry) return undefined;

  let markdown: string;
  try {
    markdown = fs.readFileSync(path.join(site.contentRoot, entry.sourcePath), {
      encoding: "utf8",
    });
  } catch {
    return undefined;
  }

  return {
    ...summarize(entry),
    sourcePath: entry.sourcePath,
    markdown,
  };
}

function resolveEntry(reference: McpPageReference): ManifestEntry | undefined {
  if (reference.slug) {
    return getPage(normalizeSlug(reference.slug));
  }
  if (reference.sourcePath) {
    return getPageBySourcePath(normalizeSourcePath(reference.sourcePath));
  }
  return undefined;
}

function search(query: string, options: McpSearchOptions): McpSearchHit[] {
  const parsed = parseTagQuery(query);
  const tags = [...options.tags, ...parsed.tags];
  return querySearchIndex(loadSearchIndex(), parsed.query, {
    tags,
    limit: options.limit,
  }).map((result) => ({
    slug: result.slug,
    title: result.title,
    href: slugToHref(result.slug),
    ...(result.description ? { description: result.description } : {}),
    tags: result.tags,
    excerpt: result.excerptParts.map((part) => part.text).join(""),
  }));
}

function summarize(entry: ManifestEntry): McpPageSummary {
  return {
    slug: entry.slug,
    title: entry.title,
    href: slugToHref(entry.slug),
    sourcePath: entry.sourcePath,
    ...(entry.description ? { description: entry.description } : {}),
    tags: entry.tags,
  };
}

function normalizeSlug(value: string): string {
  const normalized = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return normalized || "index";
}

function normalizeSourcePath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Mirrors the `#tag` and `tag:` operators of the site search route. */
function parseTagQuery(query: string): { query: string; tags: string[] } {
  const tags: string[] = [];
  const withoutOperators = query.replace(
    /(?:^|\s)tag:(#?\S+)/gi,
    (_match, tag: string) => {
      tags.push(tag);
      return " ";
    },
  );
  const withoutShortcuts = withoutOperators.replace(
    /(?:^|\s)(#\S+)/g,
    (_match, tag: string) => {
      tags.push(tag);
      return " ";
    },
  );
  return { query: withoutShortcuts.replace(/\s+/g, " ").trim(), tags };
}
