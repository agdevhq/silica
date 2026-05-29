---
title: Deployment
description: Ship your site with Docker, plain Node, or a cloud platform.
---

`silica build` produces a self-contained production site you can host anywhere that runs Node.

## Docker

New projects come with a `Dockerfile`, so you can build and run an image directly:

```bash
docker build -t my-silica-site .
docker run --env-file .env -p 3000:3000 my-silica-site
```

## Plain Node

```bash
npm ci
npm run build
npm run start
```

## Railway, Fly.io, and friends

Point the platform at the included `Dockerfile` and set the same environment variables you use locally (from `.env.example`).

| Platform | Notes                                     |
| -------- | ----------------------------------------- |
| Railway  | The container listens on `$PORT` / `3000` |
| Fly.io   | Expose internal port `3000`               |

If you enabled [[publishing/authentication|authentication]], set a strong `BETTER_AUTH_SECRET` and point `BETTER_AUTH_URL` at your public domain.

## GitHub Actions

New projects also include a workflow that builds a container image and pushes it to the GitHub Container Registry. Uncomment its deploy step to push to your own host.
