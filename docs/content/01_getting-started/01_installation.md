---
title: Installation
description: Create a new Silica vault with create-silica or add Silica to an existing project.
---

Silica keeps your repository focused on content. The framework materializes a full Next.js application at build time and treats it as a disposable artifact.

1. Scaffold a project (or clone this docs vault from the monorepo).
2. Add markdown files under `content/`.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Edit content — Silica watches `content/` and rebuilds artifacts automatically.

> [!note] Monorepo development
> This docs site lives in `docs/` and runs the CLI from the workspace packages directly. Published projects use the `silica` binary from `@silicajs/cli`.

## Create a new vault

After packages are published to npm:

```bash
npx create-silica my-vault
cd my-vault
npm install
npm run dev
```

`create-silica` scaffolds:

- `content/index.md` — home page
- `content/notes/getting-started.md` — starter note
- `silica.config.ts` — site configuration
- `package.json` with `dev`, `build`, and `start` scripts
- `.env.example`, `Dockerfile`, and a GitHub Actions workflow

## Monorepo / local development

From the Silica repository root:

```bash
npm install
npm run build
npm run --workspace docs dev
```

## Dependencies

A typical Silica project depends on:

| Package                      | Role                                  |
| ---------------------------- | ------------------------------------- |
| `@silicajs/cli`              | `silica dev/build/start` commands     |
| `@silicajs/core`             | Config, markdown pipeline, precompute |
| `@silicajs/next`             | Generated Next.js templates           |
| `@silicajs/theme-amethyst`   | Default theme (`theme: "default"`)    |
| `next`, `react`, `react-dom` | Runtime                               |

Add `@silicajs/auth` and `@silicajs/search` when you enable authentication — the generated app imports them automatically.

## TypeScript config

Scaffolded projects include a minimal `tsconfig.json` for `silica.config.ts`. You do not need a full Next.js TypeScript setup in your vault; the generated app under `.silica/next/` has its own config.
