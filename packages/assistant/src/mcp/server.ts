import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createContentSandbox, type ContentSandbox } from "../server/tools.js";
import type { McpSiteSource } from "./source.js";

export const MCP_SERVER_NAME = "silica";
export const MCP_SERVER_VERSION = "1.0.0";

const MAX_QUERY_LENGTH = 200;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 64;
const MAX_SEARCH_LIMIT = 25;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_REFERENCE_LENGTH = 512;
const MAX_COMMAND_LENGTH = 4_000;

export type McpServerInfo = {
  name?: string;
  version?: string;
};

export type CreateSilicaMcpServerOptions = {
  serverInfo?: McpServerInfo;
};

/**
 * Builds an MCP server exposing the site's published markdown to external
 * agents. Every tool is read-only; the content root is the same sandboxed
 * view the chat assistant uses.
 */
export function createSilicaMcpServer(
  source: McpSiteSource,
  options: CreateSilicaMcpServerOptions = {},
): McpServer {
  const server = new McpServer(
    {
      name: options.serverInfo?.name ?? MCP_SERVER_NAME,
      version: options.serverInfo?.version ?? MCP_SERVER_VERSION,
    },
    {
      instructions: buildInstructions(source),
    },
  );
  const tools = new Set(source.tools);
  let sandbox: ContentSandbox | undefined;
  const getSandbox = () =>
    (sandbox ??= source.sandbox ?? createContentSandbox(source.site));

  if (tools.has("search_pages")) {
    server.registerTool(
      "search_pages",
      {
        title: "Search pages",
        description:
          `Full-text search over the published pages of "${source.site.siteTitle}". ` +
          "Returns matching pages with a short excerpt. Use read_page to fetch a result in full.",
        inputSchema: {
          query: z
            .string()
            .max(MAX_QUERY_LENGTH)
            .describe("Search terms. Tags can be filtered with #tag."),
          tags: z
            .array(z.string().min(1).max(MAX_TAG_LENGTH))
            .max(MAX_TAGS)
            .optional()
            .describe("Only return pages carrying all of these tags."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(MAX_SEARCH_LIMIT)
            .optional()
            .describe(`Maximum results (default ${DEFAULT_SEARCH_LIMIT}).`),
        },
        annotations: readOnlyAnnotations(),
      },
      async ({ query, tags, limit }) => {
        const hits = await source.search(query, {
          tags: tags ?? [],
          limit: limit ?? DEFAULT_SEARCH_LIMIT,
        });
        return jsonResult({ results: hits });
      },
    );
  }

  if (tools.has("read_page")) {
    server.registerTool(
      "read_page",
      {
        title: "Read page",
        description:
          "Returns the original markdown of one published page, by slug or source path. " +
          "Slugs look like `guides/getting-started`; source paths like `Guides/Getting Started.md`.",
        inputSchema: {
          slug: z.string().min(1).max(MAX_REFERENCE_LENGTH).optional(),
          sourcePath: z.string().min(1).max(MAX_REFERENCE_LENGTH).optional(),
        },
        annotations: readOnlyAnnotations(),
      },
      async ({ slug, sourcePath }) => {
        if (!slug && !sourcePath) {
          return errorResult("Provide a slug or a sourcePath.");
        }
        const page = await source.readPage({ slug, sourcePath });
        if (!page) {
          return errorResult(
            `No published page matches ${JSON.stringify(slug ?? sourcePath)}.`,
          );
        }
        const { markdown, ...metadata } = page;
        return {
          content: [
            { type: "text", text: JSON.stringify(metadata) },
            { type: "text", text: markdown },
          ],
        };
      },
    );
  }

  if (tools.has("list_pages")) {
    server.registerTool(
      "list_pages",
      {
        title: "List pages",
        description:
          "Lists the site's navigable pages with slug, title, and link, in navigation order. " +
          "Unlisted pages such as the home page can still be read with read_page.",
        inputSchema: {},
        annotations: readOnlyAnnotations(),
      },
      async () => jsonResult({ pages: await source.listPages() }),
    );
  }

  if (tools.has("run_shell")) {
    server.registerTool(
      "run_shell",
      {
        title: "Run shell command",
        description:
          "Runs a read-only shell command over the site's markdown files in an in-process sandbox " +
          '(find . -name "*.md", grep, cat, head, tail, wc, …). The content root is /. ' +
          "There is no network, host filesystem, or environment access.",
        inputSchema: {
          command: z.string().min(1).max(MAX_COMMAND_LENGTH),
        },
        annotations: readOnlyAnnotations(),
      },
      async ({ command }, extra) => {
        try {
          return textResult(await getSandbox().run(command, extra.signal));
        } catch (error) {
          if (extra.signal.aborted) throw error;
          return errorResult(
            `Command failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  }

  return server;
}

function buildInstructions(source: McpSiteSource): string {
  const lines = [
    `This server exposes the published markdown pages of "${source.site.siteTitle}".`,
  ];
  if (source.site.siteDescription) lines.push(source.site.siteDescription);
  return lines.join("\n");
}

function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
}

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

function jsonResult(value: unknown): CallToolResult {
  return textResult(JSON.stringify(value));
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
