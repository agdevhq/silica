# @silicajs/assistant

## 0.3.1

### Patch Changes

- ba437f7: Bump @core-ai/core-ai to 0.24.0.
- b7c4556: Bump lucide-react to 1.45.0, zod to 4.6.5, better-auth to 1.7.4, @next/env to 16.3.5, katex to 0.18.7, tailwind-merge to 3.7.0.
- 889ccc7: Bump just-bash to 3.4.2, lucide-react to 1.43.0, zod to 4.6.1, better-auth to 1.6.30, @next/env to 16.3.4, fs-extra to 11.4.0, @shikijs/rehype to 4.4.3, shiki to 4.4.3, @base-ui/react to 1.8.0, react-resizable-panels to 4.12.4.
- Updated dependencies [b7c4556]
- Updated dependencies [889ccc7]
  - @silicajs/components@0.4.3
  - @silicajs/core@0.10.1
  - @silicajs/ui@0.2.2

## 0.3.0

### Minor Changes

- 255be28: Add an MCP server (`@silicajs/assistant/mcp` and `@silicajs/assistant/mcp/next`) that serves the site's published markdown to external agents over stateless Streamable HTTP. Requests authenticate with API keys from `SILICA_MCP_API_KEYS` and are rate limited per key. Tools: `search_pages`, `read_page`, `list_pages`, and `run_shell`; the endpoint never calls the model provider. `@modelcontextprotocol/sdk` is an optional peer dependency that is only needed when `assistant.mcp` is enabled.

### Patch Changes

- Updated dependencies [255be28]
  - @silicajs/core@0.10.0
  - @silicajs/components@0.4.2

## 0.2.0

### Minor Changes

- aaa7a80: Generate self-contained Next.js apps with runtime data, package dependencies, and build roots contained inside `.silica/next`.

### Patch Changes

- eb55665: Bump lucide-react to 1.21.0.
- Updated dependencies [eb55665]
- Updated dependencies [97f999f]
- Updated dependencies [aaa7a80]
- Updated dependencies [beb0e75]
  - @silicajs/components@0.4.1
  - @silicajs/ui@0.2.1
  - @silicajs/core@0.9.0

## 0.1.0

### Minor Changes

- 473d120: Add the optional AI assistant runtime. The new `@silicajs/assistant` package answers reader questions from generated markdown runtime content with citations and multi-turn conversations, signs client-held transcript turns with `SILICA_ASSISTANT_SECRET`, resolves citations from the vault database, supports provider package/factory/env/secret mappings, and includes built-in request limits.

### Patch Changes

- a1e4c0d: Remove the `@silicajs/next` peer dependency. Silica sites already receive `@silicajs/next` via CLI materialization, and the peer declaration caused Changesets to major-bump assistant when next crossed a 0.x caret boundary in the same release batch.
- Updated dependencies [473d120]
- Updated dependencies [473d120]
- Updated dependencies [473d120]
  - @silicajs/components@0.4.0
  - @silicajs/core@0.8.0
  - @silicajs/ui@0.2.0
