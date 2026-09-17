import type { SilicaAssistantMcpTool } from "@silicajs/core/runtime";
import type { AssistantSiteContext } from "../types.js";
import type { ContentSandbox } from "../server/tools.js";

export type McpPageSummary = {
  slug: string;
  title: string;
  href: string;
  sourcePath?: string;
  description?: string;
  tags?: string[];
};

export type McpPageContent = McpPageSummary & {
  sourcePath: string;
  markdown: string;
};

export type McpPageReference = {
  slug?: string;
  sourcePath?: string;
};

export type McpSearchHit = McpPageSummary & {
  excerpt: string;
};

export type McpSearchOptions = {
  tags: string[];
  limit: number;
};

type MaybePromise<T> = T | Promise<T>;

/**
 * Everything the MCP server needs to know about a site. The generated Next.js
 * route implements this over the Silica runtime data; tests use fakes.
 */
export type McpSiteSource = {
  site: AssistantSiteContext;
  /** Tools to register, in the order they are listed. */
  tools: readonly SilicaAssistantMcpTool[];
  listPages(): MaybePromise<McpPageSummary[]>;
  readPage(
    reference: McpPageReference,
  ): MaybePromise<McpPageContent | undefined>;
  search(
    query: string,
    options: McpSearchOptions,
  ): MaybePromise<McpSearchHit[]>;
  /** Test seam; defaults to a just-bash sandbox over the site's content root. */
  sandbox?: ContentSandbox;
};
