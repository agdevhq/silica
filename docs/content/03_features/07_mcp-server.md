---
title: MCP server
description: Let external AI agents read your site over the Model Context Protocol, authenticated with API keys.
---

Besides the built-in [[features/ai-assistant|AI assistant]], Silica can expose your site to external AI agents over the [Model Context Protocol](https://modelcontextprotocol.io) (MCP). Claude Desktop, Claude Code, IDE agents, and your own automations can then search your pages and read the original markdown.

The MCP server is **off by default** and builds on the assistant. A site without `assistant.mcp` never installs or loads the MCP SDK and has no `/api/mcp` route.

## Enabling the MCP server

1. Enable the [[features/ai-assistant|AI assistant]] first, then install the MCP SDK next to it:

```bash
npm install @modelcontextprotocol/sdk
```

2. Turn it on in `silica.config.ts`:

```typescript
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  // ...
  assistant: {
    provider: "openai",
    model: "gpt-5-mini",
    mcp: true,
  },
});
```

3. Generate one API key per client and put them, comma-separated, in the `SILICA_MCP_API_KEYS` environment variable:

```bash
npx silica mcp-key
```

```bash
SILICA_MCP_API_KEYS=slk_...,slk_...
```

The next `silica dev` or `silica build` generates the `/api/mcp` route. It bypasses the site's [[publishing/authentication|sign-in]] and checks the API key instead, so no browser session is needed. Keys are static: to revoke one, remove it from the variable and redeploy.

## Connecting a client

The endpoint speaks stateless Streamable HTTP. Point any MCP client at `https://your-site.example/api/mcp` with an `Authorization: Bearer <key>` header.

Claude Code:

```bash
claude mcp add --transport http docs https://your-site.example/api/mcp --header "Authorization: Bearer slk_..."
```

Claude Desktop and other clients that take a JSON config:

```json
{
  "mcpServers": {
    "docs": {
      "type": "http",
      "url": "https://your-site.example/api/mcp",
      "headers": { "Authorization": "Bearer slk_..." }
    }
  }
}
```

## What agents get

Every tool is read-only and only sees published pages, exactly like the chat assistant. Drafts and excluded files are invisible (see [[publishing/drafts-and-publishing|Drafts and publishing]]).

| Tool           | What it does                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------- |
| `search_pages` | Full-text search with the same `#tag` and `tag:` operators as the site search palette.       |
| `read_page`    | Returns the original markdown of one page by slug or source path.                            |
| `list_pages`   | Lists every published page with its slug, title, and link.                                   |
| `run_shell`    | Runs read-only shell commands (`find`, `grep`, `cat`, …) in the assistant's content sandbox. |

To expose only some of the tools:

```typescript
export default defineConfig({
  assistant: {
    provider: "openai",
    model: "gpt-5-mini",
    mcp: {
      tools: ["search_pages", "read_page"],
    },
  },
});
```

## Rate limiting

Each API key may make 60 requests per minute by default. Tune it per site, or disable it when another quota guard protects the endpoint:

```typescript
export default defineConfig({
  assistant: {
    provider: "openai",
    model: "gpt-5-mini",
    mcp: {
      rateLimit: { maxRequests: 120, windowMs: 60_000 },
    },
  },
});
```
