---
title: Deployment
description: Ship Silica sites with Docker, Node, or cloud platforms.
---

`silica build` produces a standalone Next.js production app ready for self-hosting.

## Build output

After `npm run build`:

```txt
.silica/next/.next/standalone/   # Traced Node server
.silica/next/.next/static/       # Static assets
.silica/next/public/             # Public files + /silica assets
.silica/                         # Manifest, graph, search index
content/                         # Source markdown (read at runtime)
```

## Docker

Scaffolded projects include a multi-stage `Dockerfile`:

```bash
docker build -t my-silica-site .
docker run --env-file .env -p 3000:3000 my-silica-site
```

The image runs the traced `server.js` from the standalone output. Mount or bake in `content/` and `.silica/` artifacts as needed.

## Plain Node

```bash
npm ci
npm run build
npm run start
```

`silica start` finds the standalone server when present.

## Railway / Fly.io

Use the scaffolded Dockerfile as your deployment target. Configure the same environment variables as `.env.example` in the platform dashboard.

| Platform | Notes                                 |
| -------- | ------------------------------------- |
| Railway  | Container listens on `$PORT` / `3000` |
| Fly.io   | Expose internal port `3000`           |

When auth is enabled, set `BETTER_AUTH_SECRET` to a strong random value and configure `BETTER_AUTH_URL` to your public domain.

## GitHub Actions

`create-silica` includes a workflow that builds and pushes a container image to GitHub Container Registry. Uncomment the SSH deploy step for remote hosts.

