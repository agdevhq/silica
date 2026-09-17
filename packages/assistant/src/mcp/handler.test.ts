import { describe, expect, it } from "vitest";
import { AssistantUnavailableError } from "../server/handler.js";
import { createMcpHandler, type McpHandlerOptions } from "./handler.js";
import type { McpSiteSource } from "./source.js";

const pages = [
  {
    slug: "index",
    title: "Home",
    href: "/",
    sourcePath: "index.md",
    markdown: "# Home\n\nWelcome.",
  },
  {
    slug: "guides/setup",
    title: "Setup",
    href: "/guides/setup",
    sourcePath: "Guides/Setup.md",
    description: "How to set things up",
    markdown: "# Setup\n\nRun the installer.",
  },
];

function fakeSource(overrides: Partial<McpSiteSource> = {}): McpSiteSource {
  return {
    site: {
      siteTitle: "Docs",
      siteDescription: "Test docs",
      contentRoot: process.cwd(),
      resolveCitation: () => undefined,
    },
    tools: ["search_pages", "read_page", "list_pages", "run_shell"],
    listPages: () =>
      pages.map(({ slug, title, href, description }) => ({
        slug,
        title,
        href,
        ...(description ? { description } : {}),
      })),
    readPage: ({ slug, sourcePath }) =>
      pages.find(
        (page) =>
          (slug && page.slug === slug) ||
          (sourcePath && page.sourcePath === sourcePath),
      ),
    search: (query, options) =>
      pages
        .filter((page) => page.markdown.toLowerCase().includes(query))
        .slice(0, options.limit)
        .map(({ slug, title, href }) => ({
          slug,
          title,
          href,
          tags: options.tags,
          excerpt: `…${query}…`,
        })),
    sandbox: { run: async (command) => `ran: ${command}` },
    ...overrides,
  };
}

function handlers(
  source: McpSiteSource = fakeSource(),
  options: Partial<McpHandlerOptions> = {},
) {
  return createMcpHandler({ resolve: () => ({ source }), ...options });
}

function rpcRequest(
  method: string,
  params: Record<string, unknown> = {},
  init: RequestInit = {},
): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(init.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    ...init,
  });
}

async function rpc(
  method: string,
  params: Record<string, unknown> = {},
  source: McpSiteSource = fakeSource(),
): Promise<{ result?: any; error?: any }> {
  const response = await handlers(source).POST(rpcRequest(method, params));
  expect(response.status).toBe(200);
  return response.json();
}

async function callTool(
  name: string,
  args: Record<string, unknown> = {},
  source?: McpSiteSource,
) {
  const { result, error } = await rpc(
    "tools/call",
    { name, arguments: args },
    source,
  );
  expect(error).toBeUndefined();
  return result as {
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  };
}

describe("createMcpHandler", () => {
  it("answers initialize with server info and instructions", async () => {
    const { result } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(result.serverInfo).toEqual({ name: "silica", version: "1.0.0" });
    expect(result.capabilities).toMatchObject({ tools: {} });
    expect(result.instructions).toContain('published markdown pages of "Docs"');
  });

  it("lists only the configured tools, all marked read-only", async () => {
    const { result } = await rpc("tools/list");
    expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "search_pages",
      "read_page",
      "list_pages",
      "run_shell",
    ]);
    for (const tool of result.tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        openWorldHint: false,
      });
    }

    const limited = await rpc(
      "tools/list",
      {},
      fakeSource({ tools: ["read_page", "search_pages"] }),
    );
    expect(
      limited.result.tools.map((tool: { name: string }) => tool.name),
    ).toEqual(["search_pages", "read_page"]);
  });

  it("searches pages", async () => {
    const result = await callTool("search_pages", {
      query: "installer",
      tags: ["#guide"],
      limit: 5,
    });
    expect(JSON.parse(result.content[0]!.text)).toEqual({
      results: [
        {
          slug: "guides/setup",
          title: "Setup",
          href: "/guides/setup",
          tags: ["#guide"],
          excerpt: "…installer…",
        },
      ],
    });
  });

  it("reads pages by slug or source path and reports unknown pages", async () => {
    const bySlug = await callTool("read_page", { slug: "guides/setup" });
    expect(JSON.parse(bySlug.content[0]!.text)).toEqual({
      slug: "guides/setup",
      title: "Setup",
      href: "/guides/setup",
      sourcePath: "Guides/Setup.md",
      description: "How to set things up",
    });
    expect(bySlug.content[1]!.text).toBe("# Setup\n\nRun the installer.");

    const byPath = await callTool("read_page", { sourcePath: "index.md" });
    expect(byPath.content[1]!.text).toBe("# Home\n\nWelcome.");

    const missing = await callTool("read_page", { slug: "nope" });
    expect(missing.isError).toBe(true);
    expect(missing.content[0]!.text).toContain(
      'No published page matches "nope"',
    );

    const empty = await callTool("read_page", {});
    expect(empty.isError).toBe(true);
  });

  it("lists pages", async () => {
    const result = await callTool("list_pages");
    expect(JSON.parse(result.content[0]!.text)).toEqual({
      pages: [
        { slug: "index", title: "Home", href: "/" },
        {
          slug: "guides/setup",
          title: "Setup",
          href: "/guides/setup",
          description: "How to set things up",
        },
      ],
    });
  });

  it("runs shell commands in the content sandbox", async () => {
    const result = await callTool("run_shell", { command: "ls /" });
    expect(result.content[0]!.text).toBe("ran: ls /");

    const failing = await callTool(
      "run_shell",
      { command: "boom" },
      fakeSource({
        sandbox: {
          run: async () => {
            throw new Error("exploded");
          },
        },
      }),
    );
    expect(failing.isError).toBe(true);
    expect(failing.content[0]!.text).toBe("Command failed: exploded");
  });

  it("exposes tools only, no resources or prompts", async () => {
    const { result } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(Object.keys(result.capabilities)).toEqual(["tools"]);

    const { error } = await rpc("resources/list");
    expect(error?.code).toBe(-32601);
  });

  it("lets the authorization gate short-circuit the request", async () => {
    const response = await handlers(fakeSource(), {
      authorizeRequest: () => new Response("nope", { status: 401 }),
    }).POST(rpcRequest("tools/list"));
    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("nope");
  });

  it("reports unavailable runtimes as 503 and oversized bodies as 413", async () => {
    const unavailable = await createMcpHandler({
      resolve: () => {
        throw new AssistantUnavailableError("MCP is not configured.");
      },
    }).POST(rpcRequest("tools/list"));
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({
      error: "MCP is not configured.",
    });

    const oversized = await handlers().POST(
      rpcRequest(
        "tools/list",
        {},
        {
          headers: { "content-length": String(1024 * 1024) },
        },
      ),
    );
    expect(oversized.status).toBe(413);
  });

  it("does not offer GET or DELETE in stateless mode", async () => {
    const { GET, DELETE } = handlers();
    const request = new Request("http://localhost/api/mcp");
    for (const response of [
      await GET(request),
      await DELETE(
        new Request("http://localhost/api/mcp", { method: "DELETE" }),
      ),
    ]) {
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    }
  });
});
