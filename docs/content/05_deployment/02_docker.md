---
title: Standalone Docker
description: Self-host the standalone server in a container.
---

New projects ship with a `Dockerfile` and `render: { output: "standalone" }`, so you can build and run an image directly:

```bash
docker build -t my-silica-site .
docker run --env-file .env -p 3000:3000 -v silica-cache:/app/data/cache/next my-silica-site
```

The image starts the traced Next.js standalone `server.js`. When [[publishing/authentication|authentication]] is on, the generated proxy also protects search and your vault's assets under `/silica/*`.

## Preserving the render cache

Standalone output enables Silica's filesystem cache for rendered pages. Mount `/app/data/cache/next` as a volume (as above) so those entries survive container replacement.

This works for a single container. Multiple replicas need a genuinely shared volume so they don't each render and cache independently.

## Building the image in CI

New projects also include `.github/workflows/deploy.yml`, which builds the image and pushes it to the GitHub Container Registry on every push to `main`:

```yaml
- uses: docker/build-push-action@v7
  with:
    context: .
    push: true
    tags: ghcr.io/${{ github.repository }}:latest
```

The workflow has a commented-out SSH deploy step you can enable to pull and restart the image on your own host.
