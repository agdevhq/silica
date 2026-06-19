---
title: Configuration
description: Every option in silica.config.ts.
---

All of your site's settings live in `silica.config.ts` at the project root.

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "My Site",
  description: "Site description",
  baseUrl: "https://docs.example.com",
  theme: "default",
});
```

## Site basics

| Option        | Default                     | What it does                                      |
| ------------- | --------------------------- | ------------------------------------------------- |
| `title`       | `"Silica"`                  | Site name in the header, metadata, and search     |
| `description` | `"A Silica knowledge site"` | Default page description                          |
| `logo`        | —                           | Logo on the sign-in page (`/logo.svg` or a URL)   |
| `baseUrl`     | —                           | Your public URL, used for the sitemap and sign-in |
| `contentDir`  | `"content"`                 | Folder that holds your Markdown vault             |
| `theme`       | `"default"`                 | The site theme                                    |

## Links

| Option               | Default      | What it does                                |
| -------------------- | ------------ | ------------------------------------------- |
| `wikilinks.strategy` | `"shortest"` | `"shortest"`, `"absolute"`, or `"relative"` |
| `wikilinks.strict`   | `false`      | Fail the build when links cannot resolve    |

See [[writing/links|Links]].

## Tags

| Option        | Default | What it does                             |
| ------------- | ------- | ---------------------------------------- |
| `tags.inline` | `true`  | Recognize `#tags` written in note bodies |

See [[writing/tags|Tags]].

## Ordering

| Option                     | Default | What it does                          |
| -------------------------- | ------- | ------------------------------------- |
| `ordering.numericPrefixes` | `true`  | Use leading numbers for ordering only |

When on, files like `01_Home.md` sort by their number while the number is dropped from URLs and labels. See [[features/navigation|Navigation]].

## Which pages get published

| Option                    | Default | What it does                              |
| ------------------------- | ------- | ----------------------------------------- |
| `filters.removeDrafts`    | `true`  | Exclude pages with `draft: true`          |
| `filters.explicitPublish` | `false` | Require `publish: true` to include a page |

See [[publishing/drafts-and-publishing|Drafts and publishing]].

## Rendering

The `render` block controls how pages are prerendered and what kind of build `silica build` produces.

| Option             | Default     | What it does                                                   |
| ------------------ | ----------- | -------------------------------------------------------------- |
| `render.output`    | `"default"` | `"default"` for managed platforms, `"standalone"` to self-host |
| `render.prerender` | `"all"`     | Which pages are built ahead of time                            |

### `render.output`

This is the setting that decides how you ship the site:

- `"default"` emits a regular Next.js build. The hosting platform's adapter (for example, Vercel) bundles the server and manages its own caching.
- `"standalone"` emits a self-contained server and turns on Silica's filesystem cache handler. Use it when you self-host, for example with the included `Dockerfile`. Point the cache somewhere durable with `render.cache.directory` (defaults to a folder under the build output).

```ts
export default defineConfig({
  // Self-host with the included Dockerfile.
  render: { output: "standalone" },
});
```

See [[deployment/overview|Deployment]] for the full picture.

### `render.prerender`

Pages that are not prerendered are rendered on first request and then cached.

| Value                       | What it does                                      |
| --------------------------- | ------------------------------------------------- |
| `"all"`                     | Prerender every page (the default)                |
| `"none"`                    | Render every page on demand                       |
| `{ depth: N }`              | Prerender pages up to `N` levels deep             |
| `{ strategy: "custom", … }` | Pick pages with `include`, `exclude`, and `limit` |

```ts
export default defineConfig({
  render: {
    prerender: { depth: 2 },
  },
});
```

## Authentication

Leave it off (the default) for a public site, or configure it:

```ts
auth: {
  provider: "google",
  allowedDomains: ["example.com"],
  allowedEmails: ["you@example.com"],
}
```

See [[publishing/authentication|Authentication]].

## Editing the config

Changing `silica.config.ts` restarts the dev server. Content-only edits reload instantly.
