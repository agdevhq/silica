---
title: Architecture
description: Packages, build pipeline, and how Silica fits together.
---

Silica is a monorepo of focused packages. Your vault project consumes a small subset; the rest powers code generation and runtime.

## Packages

| Package                    | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| `@silicajs/core`           | Config, slug helpers, markdown pipeline, precompute     |
| `@silicajs/ui`             | Generic shadcn-style components (Base UI + Tailwind v4) |
| `@silicajs/components`     | Vault tree, breadcrumbs, ToC, backlinks, search UI      |
| `@silicajs/next`           | Generated Next.js routes, loaders, proxy templates      |
| `@silicajs/cli`            | `create`, `dev`, `build`, `start` commands              |
| `@silicajs/auth`           | Better Auth wrapper and allowlist helpers               |
| `@silicajs/search`         | FlexSearch index build and query                        |
| `@silicajs/theme-amethyst` | Default theme — composes UI + components                |
| `create-silica`            | User-facing `npx create-silica` entry point             |

## Build pipeline

```mermaid
flowchart LR
  A[content/] --> B[@silicajs/cli]
  C[silica.config.ts] --> B
  B --> D[Materialize .silica/next/]
  B --> E[Precompute]
  E --> F[manifest.json]
  E --> G[graph.json]
  E --> H[search-index.json]
  D --> I[Next.js build]
  F --> I
  G --> I
  H --> I
  I --> J[Production site]
```

### Step by step

1. **CLI materializes** `.silica/next/` from templates in `@silicajs/next`
2. **Core precomputes** — scans `content/`, filters drafts, builds manifest, graph, search index, copies assets
3. **Next.js renders** pages from `app/[[...slug]]/page.tsx` — markdown is read from disk and cached
4. **Theme** owns layout chrome; **components** provide vault UI on top of **ui** primitives
5. **Auth proxy** (when enabled) gates requests before cached content is served

## Markdown pipeline

Raw markdown flows through:

1. `gray-matter` — frontmatter parsing
2. Obsidian transforms — wikilinks, highlights, callout markers, asset rewriting
3. `remark-gfm` + `remark-math` — GFM and math
4. `rehype-shiki` — syntax highlighting
5. Custom rehype plugins — callouts, ToC collection, external link attrs
6. `rehype-react` — React tree with theme component overrides

Themes register components for `silica-callout` and `silica-code-block`.

## Runtime content

Pages render markdown at request time (with Next.js caching), so you can deploy updated `content/` without rebuilding if your hosting setup supports it. The precompute step still runs to refresh navigation, search, and the link graph.

## This docs site

The docs site at `docs/` in the Silica monorepo is the site you are reading. It dogfoods the framework for development and testing.
