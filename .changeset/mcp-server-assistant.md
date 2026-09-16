---
"@silicajs/assistant": minor
---

Add an MCP server (`@silicajs/assistant/mcp` and `@silicajs/assistant/mcp/next`) that serves the site's published markdown to external agents over stateless Streamable HTTP. Requests authenticate with API keys from `SILICA_MCP_API_KEYS` and are rate limited per key. Tools: `search_pages`, `read_page`, `list_pages`, and `run_shell`; the endpoint never calls the model provider. `@modelcontextprotocol/sdk` is an optional peer dependency that is only needed when `assistant.mcp` is enabled.
