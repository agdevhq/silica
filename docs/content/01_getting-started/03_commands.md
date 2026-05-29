---
title: Commands
description: The silica dev, build, and start commands.
---

The `silica` command is the only tool you need day to day. Your `package.json` wires it to the usual npm scripts.

## `silica dev`

Starts a local development server with live reload.

```bash
npm run dev
# runs: silica dev
```

While it is running, Silica watches your project and updates the site as you save:

- changes to anything in `content/` reload instantly
- changes to `silica.config.ts` restart the dev server

Open `http://localhost:3000` to view your site.

## `silica build`

Builds the production site, ready to deploy.

```bash
npm run build
# runs: silica build
```

See [[publishing/deployment|Deployment]] for what to do with the output.

## `silica start`

Serves the production build locally so you can check it before shipping.

```bash
npm run start
# runs: silica start
```

## `silica create`

Scaffolds a brand-new vault. This is what `npx create-silica` runs.

```bash
silica create my-vault
```
