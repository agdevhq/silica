---
title: Railway, Render & Fly.io
description: Run the container image on a PaaS, or on any Node host.
---

These platforms run the standalone container image, so keep `render: { output: "standalone" }` and point them at the scaffolded `Dockerfile`. Set the same environment variables you use locally (from `.env.example`) in the platform dashboard.

| Platform | Notes                                             |
| -------- | ------------------------------------------------- |
| Railway  | The container listens on `$PORT` / `3000`         |
| Render   | Use the Dockerfile; the service listens on `3000` |
| Fly.io   | Expose internal port `3000`                       |

To preserve the rendered-page cache across deploys, mount a persistent volume at `/app/data/cache/next` (see [[deployment/docker|Docker]]).

## Any Node host

There is no magic to the build — `silica build` produces a standalone server you can run yourself:

```bash
npm ci
npm run build
npm run start
```

`silica start` serves the standalone output when it is present, falling back to `next start` otherwise.
