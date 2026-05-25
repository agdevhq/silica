# Silica

Silica is a Next.js framework for publishing Obsidian-flavored markdown vaults as polished, authenticated, server-rendered knowledge sites.

The user's project stays small:

```txt
content/
public/
silica.config.ts
package.json
```

`silica dev` and `silica build` materialize the full Next.js app under `.silica/next/`, run the content precompute step, and leave the generated scaffold as a disposable build artifact.

## Quickstart

```bash
npm install
npm run build
npm run --workspace examples/minimal-vault build
```

To create a new vault after packages are published:

```bash
npx create-silica my-vault
cd my-vault
npm install
npm run dev
```

## Packages

| Package | Purpose |
| --- | --- |
| `@silicajs/core` | Config loading, Quartz-inspired slug/path helpers, markdown rendering, and precompute artifacts. |
| `@silicajs/next` | Generated Next.js routes, server data loaders, proxy, templates, and primitives. |
| `@silicajs/cli` | `silica create/dev/build/start` and `.silica/next` materialization. |
| `@silicajs/auth` | Better Auth wrapper and allowlist helpers. |
| `@silicajs/search` | FlexSearch index build/load/query helpers. |
| `@silicajs/theme-default` | Default persistent-chrome theme. |
| `create-silica` | `npx create-silica` wrapper around `silica create`. |

## Architecture

1. `@silicajs/cli` materializes `.silica/next/` from templates in `@silicajs/next`.
2. `@silicajs/core` scans `content/`, filters drafts, builds `manifest.json`, `graph.json`, `search-index.json`, and copies assets to `.silica/next/public/silica/`.
3. Next.js 16 renders vault pages from `.silica/next/app/[[...slug]]/page.tsx`. The cached `VaultContent` server component reads markdown from disk and returns a React tree.
4. The theme owns persistent layout chrome while primitives provide explorer, breadcrumbs, ToC, backlinks, dark mode, and search UI.
5. Auth is enforced in generated `proxy.ts` before cached page content is served.

## Development

```bash
npm install
npm run build
npm test
npm run typecheck
```

The dogfood fixture lives in `examples/minimal-vault`.

## Self-hosting

`silica build` emits a standalone Next.js production app in `.silica/next/.next/`. The scaffolded Dockerfile copies:

- `.silica/next/.next/standalone/`
- `.silica/next/.next/static/`
- `.silica/next/public/`
- `.silica/` artifacts
- `content/`

This keeps runtime content rendering available while serving through a minimal Node image.
