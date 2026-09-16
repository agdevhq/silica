import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { AssistantUnavailableError } from "../server/handler.js";
import {
  createSilicaMcpServer,
  type CreateSilicaMcpServerOptions,
} from "./server.js";
import type { McpSiteSource } from "./source.js";

const MAX_REQUEST_BODY_BYTES = 512 * 1024;

export type McpRuntime = CreateSilicaMcpServerOptions & {
  source: McpSiteSource;
};

export type McpHandlerOptions = {
  /**
   * Request gate for authentication, quotas, or rate limits. Return a Response
   * to reject before the body is parsed or runtime dependencies are resolved.
   */
  authorizeRequest?: (
    request: Request,
  ) => Response | undefined | Promise<Response | undefined>;
  /**
   * Resolves the site source for the current request. Throw
   * `AssistantUnavailableError` to report a 503 with its message.
   */
  resolve: (request: Request) => McpRuntime | Promise<McpRuntime>;
};

export type McpRouteHandlers = {
  POST: (request: Request) => Promise<Response>;
  GET: (request: Request) => Promise<Response>;
  DELETE: (request: Request) => Promise<Response>;
};

/**
 * Creates fetch-style handlers for a stateless MCP Streamable HTTP endpoint.
 * Every POST builds a fresh server and transport and answers with plain JSON,
 * so the endpoint works unchanged on serverless and multi-instance hosts.
 * GET (server-initiated streams) and DELETE (session teardown) are not
 * offered in stateless mode and answer 405.
 */
export function createMcpHandler(options: McpHandlerOptions): McpRouteHandlers {
  return {
    POST: async (request) => {
      const authorizationResponse = await options.authorizeRequest?.(request);
      if (authorizationResponse) return authorizationResponse;

      const contentLength = Number(request.headers.get("content-length"));
      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_REQUEST_BODY_BYTES
      ) {
        return jsonError("MCP request body is too large.", 413);
      }

      let runtime: McpRuntime;
      try {
        runtime = await options.resolve(request);
      } catch (error) {
        if (error instanceof AssistantUnavailableError) {
          return jsonError(error.message, 503);
        }
        throw error;
      }

      const server = createSilicaMcpServer(runtime.source, runtime);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      try {
        return await transport.handleRequest(request);
      } finally {
        await server.close().catch(() => undefined);
      }
    },
    GET: async () => methodNotAllowed(),
    DELETE: async () => methodNotAllowed(),
  };
}

function methodNotAllowed(): Response {
  return jsonError("Method not allowed.", 405, { allow: "POST" });
}

function jsonError(
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json({ error: message }, { status, headers });
}
