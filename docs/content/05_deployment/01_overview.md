---
title: Deploying your site
menu_label: Overview
description: Ship your site by self-hosting it or handing it to a managed platform.
---

`silica build` produces a self-contained production site you can host anywhere that runs Node. How you ship it comes down to one setting in `silica.config.ts`: `render.output`.

## Pick an output mode

| `render.output` | Who runs the server | Good for                            |
| --------------- | ------------------- | ----------------------------------- |
| `"standalone"`  | You                 | Docker, your own VM, container PaaS |
| `"default"`     | The platform        | Vercel and other managed hosts      |

- **`"standalone"`** emits a self-contained Next.js server and enables Silica's filesystem cache for rendered pages. New projects ship with `render: { output: "standalone" }` so the included `Dockerfile` works out of the box.
- **`"default"`** emits a regular Next.js build and lets the platform's adapter bundle the server and own caching.

See [[publishing/configuration|Configuration]] for the full `render` block.

## Choose a target

- [[deployment/docker|Docker]] — self-host the standalone server in a container.
- [[deployment/vercel|Vercel]] — push to a managed platform.
- [[deployment/railway-render-fly|Railway, Render & Fly.io]] — run the container image on a PaaS, or on any Node host.

## Environment variables

Whatever you deploy to, set the same variables you use locally (from `.env.example`). If you enabled [[publishing/authentication|authentication]], set a strong `BETTER_AUTH_SECRET` and point `BETTER_AUTH_URL` (and `baseUrl` in `silica.config.ts`) at your public domain.

| Variable               | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `BETTER_AUTH_SECRET`   | Session secret (required in production) |
| `BETTER_AUTH_URL`      | Your public site URL                    |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret              |
