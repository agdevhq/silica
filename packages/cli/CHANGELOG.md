# @silicajs/cli

## 0.5.1

### Patch Changes

- b7c4556: Bump lucide-react to 1.45.0, zod to 4.6.5, better-auth to 1.7.4, @next/env to 16.3.5, katex to 0.18.7, tailwind-merge to 3.7.0.
- 889ccc7: Bump just-bash to 3.4.2, lucide-react to 1.43.0, zod to 4.6.1, better-auth to 1.6.30, @next/env to 16.3.4, fs-extra to 11.4.0, @shikijs/rehype to 4.4.3, shiki to 4.4.3, @base-ui/react to 1.8.0, react-resizable-panels to 4.12.4.
- Updated dependencies [b7c4556]
- Updated dependencies [0da74b4]
- Updated dependencies [889ccc7]
  - @silicajs/core@0.10.1
  - @silicajs/next@0.7.1

## 0.5.0

### Minor Changes

- 255be28: Materialize the MCP route and its SDK dependency when `assistant.mcp` is enabled, fail early when `@modelcontextprotocol/sdk` is missing, and add `silica mcp-key` for generating API keys.

### Patch Changes

- Updated dependencies [255be28]
- Updated dependencies [255be28]
  - @silicajs/core@0.10.0
  - @silicajs/next@0.7.0

## 0.4.0

### Minor Changes

- aaa7a80: Generate self-contained Next.js apps with runtime data, package dependencies, and build roots contained inside `.silica/next`.

### Patch Changes

- fbdd7ad: Load project environment files from the visible Silica project root instead of copying them into the generated Next.js app.
- beb0e75: Bump better-sqlite3 to 12.11.1.
- Updated dependencies [13b23e9]
- Updated dependencies [562a4dd]
- Updated dependencies [97f999f]
- Updated dependencies [df805cb]
- Updated dependencies [aaa7a80]
- Updated dependencies [032b72d]
- Updated dependencies [beb0e75]
  - @silicajs/next@0.6.0
  - @silicajs/core@0.9.0

## 0.3.0

### Minor Changes

- 473d120: Materialize assistant routes and UI wiring for assistant-enabled projects, including dependency checks for the configured provider package before generating the Next app.

### Patch Changes

- Updated dependencies [473d120]
- Updated dependencies [473d120]
  - @silicajs/core@0.8.0
  - @silicajs/next@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [3ae2fe0]
- Updated dependencies [4461778]
  - @silicajs/core@0.7.0
  - @silicajs/next@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [63d14e0]
  - @silicajs/core@0.6.0
  - @silicajs/next@0.3.1

## 0.2.0

### Minor Changes

- cbdf8ca: Add configurable prerender selection with stable vault render hashes, persistent filesystem-backed render caching, and a consolidated SQLite vault database for metadata and search.

### Patch Changes

- Updated dependencies [cbdf8ca]
  - @silicajs/core@0.5.0
  - @silicajs/next@0.3.0

## 0.1.6

### Patch Changes

- fc07754: Speed up large vault builds by indexing wikilinks once, parallelizing markdown precompute analysis, reusing cached Next runtime data during page generation, and supporting Next config overrides from `silica.config.ts`.
- Updated dependencies [fc07754]
  - @silicajs/core@0.4.0
  - @silicajs/next@0.2.2

## 0.1.5

### Patch Changes

- Updated dependencies [605efb3]
  - @silicajs/core@0.3.0
  - @silicajs/next@0.2.1

## 0.1.4

### Patch Changes

- Updated dependencies [5525573]
  - @silicajs/core@0.2.0
  - @silicajs/next@0.2.0

## 0.1.3

### Patch Changes

- a014a0c: Fix fresh scaffold dependency layout and Tailwind source detection for installed themes.
- Updated dependencies [45e8717]
- Updated dependencies [fa2ed69]
- Updated dependencies [a014a0c]
  - @silicajs/core@0.1.1
  - @silicajs/next@0.1.2

## 0.1.2

### Patch Changes

- 5a3dce8: Bump commander to 15.0.0.
- Updated dependencies [b9f62e7]
  - @silicajs/next@0.1.1

## 0.1.1

### Patch Changes

- f4b447f: Fix the published CLI entrypoints so `silica` commands execute after bundling while package exports remain import-safe.
