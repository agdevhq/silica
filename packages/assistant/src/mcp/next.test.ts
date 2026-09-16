import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createMcpRouteHandler, type McpRouteOptions } from "./next.js";

const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "silica-mcp-next-"));
const contentRoot = path.join(projectRoot, "data/content");
fs.mkdirSync(path.join(contentRoot, "Guides"), { recursive: true });
fs.writeFileSync(path.join(contentRoot, "index.md"), "# Home\n\nWelcome.");
fs.writeFileSync(
  path.join(contentRoot, "Guides/Setup.md"),
  "---\ntitle: Setup\n---\n\n# Setup\n\nRun the installer.",
);

const entries = {
  index: {
    slug: "index",
    title: "Home",
    sourcePath: "index.md",
    tags: [],
  },
  "guides/setup": {
    slug: "guides/setup",
    title: "Setup",
    sourcePath: "Guides/Setup.md",
    description: "How to set things up",
    tags: ["guide"],
  },
};

const mockState = vi.hoisted(() => ({
  mcp: undefined as
    | { tools: string[]; rateLimit?: { maxRequests?: number } | false }
    | undefined,
}));

vi.mock("@silicajs/next/server-data", () => ({
  getConfig: () => ({
    title: "Docs",
    description: "Test docs",
    assistant: {
      provider: {
        package: "@core-ai/openai",
        factory: "createOpenAI",
        secrets: { apiKey: "OPENAI_API_KEY" },
      },
      model: "fake-model",
      ...(mockState.mcp ? { mcp: mockState.mcp } : {}),
    },
    wikilinks: { strategy: "shortest" },
    ordering: { numericPrefixes: true },
  }),
  getNavigation: () => ({
    version: 1,
    entries: Object.values(entries).map(({ slug, title }) => ({ slug, title })),
  }),
  getPage: (slug: string) => entries[slug as keyof typeof entries],
  getPageBySourcePath: (sourcePath: string) =>
    Object.values(entries).find((entry) => entry.sourcePath === sourcePath),
  getProjectRoot: () => projectRoot,
  loadSearchIndex: () => ({ db: {}, databasePath: "", close: () => undefined }),
  resolveWikiLinkFromDb: () => undefined,
}));

vi.mock("@silicajs/search", () => ({
  querySearchIndex: (
    _index: unknown,
    query: string,
    options: { tags: string[]; limit: number },
  ) => [
    {
      slug: "guides/setup",
      title: "Setup",
      titleParts: [],
      description: "How to set things up",
      tags: options.tags,
      excerptParts: [
        { text: "Run the ", highlighted: false },
        { text: query, highlighted: true },
      ],
      score: 1,
    },
  ],
}));

const originalKeys = process.env.SILICA_MCP_API_KEYS;
let keyCounter = 0;

beforeEach(() => {
  mockState.mcp = {
    tools: ["search_pages", "read_page", "list_pages", "run_shell"],
    rateLimit: false,
  };
  delete process.env.SILICA_MCP_API_KEYS;
});

afterEach(() => {
  if (originalKeys === undefined) delete process.env.SILICA_MCP_API_KEYS;
  else process.env.SILICA_MCP_API_KEYS = originalKeys;
});

afterAll(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function freshKey(): string {
  keyCounter += 1;
  return `slk_test_${keyCounter}`;
}

function route(options: McpRouteOptions = {}) {
  return createMcpRouteHandler(options);
}

function rpcRequest(
  method: string,
  params: Record<string, unknown> = {},
  key?: string,
): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  options: McpRouteOptions = {},
) {
  const key = freshKey();
  const response = await route({ apiKeys: () => [key], ...options }).POST(
    rpcRequest("tools/call", { name, arguments: args }, key),
  );
  expect(response.status).toBe(200);
  const { result, error } = await response.json();
  expect(error).toBeUndefined();
  return result as {
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  };
}

describe("createMcpRouteHandler", () => {
  it("answers 404 when the MCP server is not enabled in the site config", async () => {
    mockState.mcp = undefined;
    const response = await route().POST(rpcRequest("tools/list", {}, "slk_x"));
    expect(response.status).toBe(404);
  });

  it("requires an API key from the environment", async () => {
    const unconfigured = await route().POST(rpcRequest("tools/list"));
    expect(unconfigured.status).toBe(503);

    process.env.SILICA_MCP_API_KEYS = "slk_env_a, slk_env_b";
    const missing = await route().POST(rpcRequest("tools/list"));
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toContain("Bearer");

    const wrong = await route().POST(rpcRequest("tools/list", {}, "slk_nope"));
    expect(wrong.status).toBe(401);

    const ok = await route().POST(rpcRequest("tools/list", {}, "slk_env_b"));
    expect(ok.status).toBe(200);
    const { result } = await ok.json();
    expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "search_pages",
      "read_page",
      "list_pages",
      "run_shell",
    ]);
  });

  it("rate limits per API key", async () => {
    mockState.mcp = { tools: ["list_pages"], rateLimit: { maxRequests: 1 } };
    const first = freshKey();
    const second = freshKey();
    const handler = route({ apiKeys: () => [first, second] });

    expect(
      (await handler.POST(rpcRequest("tools/list", {}, first))).status,
    ).toBe(200);
    const limited = await handler.POST(rpcRequest("tools/list", {}, first));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(
      (await handler.POST(rpcRequest("tools/list", {}, second))).status,
    ).toBe(200);
  });

  it("lists pages from the navigation", async () => {
    const result = await callTool("list_pages", {});
    expect(JSON.parse(result.content[0]!.text)).toEqual({
      pages: [
        { slug: "index", title: "Home", href: "/" },
        { slug: "guides/setup", title: "Setup", href: "/guides/setup" },
      ],
    });
  });

  it("reads published markdown from the generated content root", async () => {
    const bySlug = await callTool("read_page", { slug: "/guides/setup/" });
    expect(JSON.parse(bySlug.content[0]!.text)).toEqual({
      slug: "guides/setup",
      title: "Setup",
      href: "/guides/setup",
      sourcePath: "Guides/Setup.md",
      description: "How to set things up",
      tags: ["guide"],
    });
    expect(bySlug.content[1]!.text).toContain("Run the installer.");

    const byPath = await callTool("read_page", { sourcePath: "/index.md" });
    expect(byPath.content[1]!.text).toBe("# Home\n\nWelcome.");

    const missing = await callTool("read_page", { slug: "drafts/secret" });
    expect(missing.isError).toBe(true);
  });

  it("searches with the site search index and tag operators", async () => {
    const result = await callTool("search_pages", {
      query: "installer #guide",
      tags: ["ops"],
    });
    expect(JSON.parse(result.content[0]!.text)).toEqual({
      results: [
        {
          slug: "guides/setup",
          title: "Setup",
          href: "/guides/setup",
          description: "How to set things up",
          tags: ["ops", "#guide"],
          excerpt: "Run the installer",
        },
      ],
    });
  });

  it("runs sandboxed shell commands over the content root", async () => {
    const result = await callTool("run_shell", {
      command: "find . -name '*.md' | sort",
    });
    expect(result.content[0]!.text).toBe("./Guides/Setup.md\n./index.md");
  });
});
