---
title: Vercel
description: Deploy to Vercel and let its adapter run the server.
---

Vercel is the easiest managed option. Let Vercel's adapter bundle the server and manage caching by using the default output mode.

## Set the output mode

Remove the scaffold's standalone setting (or set it explicitly) so you get a regular Next.js build:

```ts
export default defineConfig({
  render: { output: "default" },
});
```

## Project settings

Silica builds the Next.js app under `.silica/next/`, so point Vercel at that output. For a project created with `silica create`, the repo root is the project root:

| Setting          | Value                |
| ---------------- | -------------------- |
| Framework Preset | Next.js              |
| Build Command    | `npm run build`      |
| Output Directory | `.silica/next/.next` |
| Install Command  | default              |
| Root Directory   | empty                |

The easiest way to lock this in is a `vercel.json` at the project root, so you never have to touch the dashboard:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".silica/next/.next"
}
```

## Authentication and env vars

Add the variables from `.env.example` in the Vercel project settings. If [[publishing/authentication|authentication]] is on, set `baseUrl` in `silica.config.ts` and `BETTER_AUTH_URL` to your Vercel URL so sign-in redirects resolve.
