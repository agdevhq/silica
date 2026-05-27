---
title: Commands
description: silica dev, build, and start — the CLI workflow.
---

The `silica` CLI (from `@silicajs/cli`) is the only tool you need day to day.

## `silica dev`

Materializes `.silica/next/`, runs precompute, and starts `next dev`.

```bash
npm run dev
# equivalent to: silica dev
```

During development, Silica watches:

- `content/**/*` — markdown changes trigger precompute and Next.js revalidation
- `silica.config.ts` — config changes require a full restart
- `themes/**/*` — custom theme changes require a restart

## `silica build`

Materializes, precomputes, and runs `next build` for production.

```bash
npm run build
# equivalent to: silica build
```

Output lands in `.silica/next/.next/`. Standalone mode is enabled so you can deploy a minimal Node image.

## `silica start`

Serves the production build.

```bash
npm run start
# equivalent to: silica start
```

Uses the standalone `server.js` when present, falling back to `next start` otherwise.

## `silica create`

Scaffolds a new vault directory (also available as `npx create-silica`).

```bash
silica create my-vault
```

## What happens on each command

1. **Materialize** — copy Next.js templates from `@silicajs/next` into `.silica/next/`
2. **Precompute** — scan `content/`, build manifest, graph, search index, copy assets
3. **Next.js** — dev server or production build

See [[architecture|Architecture]] for the full pipeline.

