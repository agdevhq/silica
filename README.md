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
| `@silicajs/ui` | Generic shadcn-style component library (Base UI + Tailwind v4). Authored via the shadcn CLI. |
| `@silicajs/components` | Silica-aware, framework-agnostic React composables (vault tree, breadcrumbs, ToC, backlinks, search, …) built on `@silicajs/ui`. |
| `@silicajs/next` | Generated Next.js routes, server data loaders, proxy, and templates. |
| `@silicajs/cli` | `silica create/dev/build/start` and `.silica/next` materialization. |
| `@silicajs/auth` | Better Auth wrapper and allowlist helpers. |
| `@silicajs/search` | FlexSearch index build/load/query helpers. |
| `@silicajs/theme-amethyst` | Default amethyst/violet theme — pure composition over `@silicajs/ui` + `@silicajs/components`. |
| `@silicajs/create` | Internal scaffolder wrapper around `silica create`. |
| `create-silica` | User-facing `npx create-silica` package. |

## Architecture

1. `@silicajs/cli` materializes `.silica/next/` from templates in `@silicajs/next`.
2. `@silicajs/core` scans `content/`, filters drafts, builds `manifest.json`, `graph.json`, `search-index.json`, and copies assets to `.silica/next/public/silica/`.
3. Next.js 16 renders vault pages from `.silica/next/app/[[...slug]]/page.tsx`. The cached `VaultContent` server component reads markdown from disk and returns a React tree.
4. The theme owns persistent layout chrome while `@silicajs/components` provides the vault tree, breadcrumbs, ToC, backlinks, dark mode, and search UI on top of `@silicajs/ui` primitives.
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

### Docker

Projects scaffolded with `silica create` include a Dockerfile:

```bash
docker build -t my-silica-site .
docker run --env-file .env -p 3000:3000 my-silica-site
```

The generated image starts the traced Next.js standalone `server.js` and serves `.silica/next/public` plus vault assets under `/silica/*`.

### Plain Node

```bash
npm ci
npm run build
npm run start
```

`silica start` runs the standalone output when present, falling back to `next start` for development-like environments.

### Railway / Fly.io

Use the scaffolded Dockerfile as the deployment target. Configure the same environment variables as `.env.example` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) in the platform dashboard. For Fly.io, expose internal port `3000`; for Railway, the container listens on `$PORT`/`3000` through the Next server.
