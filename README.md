<h1>
  <img src="assets/logo.png" alt="" height="42" valign="bottom" style="margin-right: 6px;" />
  Silica
</h1>

Silica is a framework for publishing Obsidian-flavored markdown vaults as polished, authenticated, server-rendered knowledge sites.

The user's project stays small:

```txt
content/
public/
silica.config.ts
package.json
```

`silica dev` and `silica build` run precompute, materialize the Next.js scaffold under `.silica/next/`, and treat that output as a disposable build artifact.

## Quickstart

```bash
npm install
npm run build
npm run --workspace docs build
```

To create a new vault after packages are published:

```bash
npx create-silica my-vault
cd my-vault
npm install
npm run dev
```

## Packages

| Package                     | Purpose                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@silicajs/core`            | Config loading, Quartz-inspired slug/path helpers, markdown rendering, and precompute artifacts.                                 |
| `@silicajs/remark-obsidian` | Neutral remark plugin for Obsidian-flavored Markdown: wikilinks, embeds, callouts, highlights, comments, block IDs, and tags.    |
| `@silicajs/ui`              | Generic shadcn-style component library (Base UI + Tailwind v4). Authored via the shadcn CLI.                                     |
| `@silicajs/components`      | Silica-aware, framework-agnostic React composables (vault tree, breadcrumbs, ToC, backlinks, search, …) built on `@silicajs/ui`. |
| `@silicajs/next`            | Next.js runtime adapter — generated routes, server loaders, proxy, and templates.                                                |
| `@silicajs/cli`             | `silica create/dev/build/start` and `.silica/next` materialization.                                                              |
| `@silicajs/auth`            | Better Auth wrapper and allowlist helpers.                                                                                       |
| `@silicajs/search`          | SQLite full-text search database build/load/query helpers.                                                                       |
| `@silicajs/theme-amethyst`  | Default amethyst/violet theme — pure composition over `@silicajs/ui` + `@silicajs/components`.                                   |
| `@silicajs/create`          | Internal scaffolder wrapper around `silica create`.                                                                              |
| `create-silica`             | User-facing `npx create-silica` package.                                                                                         |

## Architecture

1. `@silicajs/cli` materializes `.silica/next/` from templates in `@silicajs/next`.
2. `@silicajs/core` scans `content/`, filters drafts, builds `manifest.json`, `graph.json`, `search.db`, and copies assets to `.silica/next/public/silica/`.
3. Next.js (via `@silicajs/next`) renders vault pages from `.silica/next/app/[[...slug]]/page.tsx`. The cached `VaultContent` server component reads markdown from disk and returns a React tree.
4. The theme owns persistent layout chrome while `@silicajs/components` provides the vault tree, breadcrumbs, ToC, backlinks, dark mode, and search UI on top of `@silicajs/ui` primitives.
5. Auth settings are baked into generated `proxy.ts`, which enforces access before cached pages, search, or vault assets are served.

## Development

```bash
npm install
npm run build
npm test
npm run typecheck
```

The docs site and dogfood fixture lives in `docs/`.

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

The generated image starts the traced Next.js standalone `server.js`. If auth is enabled, the generated proxy also protects search and vault assets under `/silica/*`.

### Plain Node

```bash
npm ci
npm run build
npm run start
```

`silica start` runs the standalone output when present, falling back to `next start` for development-like environments.

### Railway / Fly.io

Use the scaffolded Dockerfile as the deployment target. Configure the same environment variables as `.env.example` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) in the platform dashboard. Auth requires a strong `BETTER_AUTH_SECRET` in production and at least one `allowedDomains` or `allowedEmails` entry in `silica.config.ts`. For Fly.io, expose internal port `3000`; for Railway, the container listens on `$PORT`/`3000`.
