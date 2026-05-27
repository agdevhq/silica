---
title: Configuration
description: silica.config.ts options and defaults.
---

All site behavior is controlled from `silica.config.ts` at the project root.

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "My Site",
  description: "Site description",
  baseUrl: "https://docs.example.com",
  contentDir: "content",
  theme: "default",
  auth: {
    /* ... */
  },
  wikilinks: {
    /* ... */
  },
  filters: {
    /* ... */
  },
});
```

## Options reference

### Site metadata

| Option        | Default                     | Description                                  |
| ------------- | --------------------------- | -------------------------------------------- |
| `title`       | `"Silica"`                  | Site name in header, metadata, and search    |
| `description` | `"A Silica knowledge site"` | Default meta description                     |
| `baseUrl`     | —                           | Canonical URL for sitemap and auth callbacks |
| `contentDir`  | `"content"`                 | Path to the markdown vault                   |

### Theme

| Option  | Default     | Description                                      |
| ------- | ----------- | ------------------------------------------------ |
| `theme` | `"default"` | Theme package name or `{ name, options }` object |

`"default"` resolves to `@silicajs/theme-amethyst`.

### Wikilinks

| Option               | Default      | Description                                 |
| -------------------- | ------------ | ------------------------------------------- |
| `wikilinks.strategy` | `"shortest"` | `"shortest"`, `"absolute"`, or `"relative"` |
| `wikilinks.strict`   | `false`      | Treat ambiguous wikilink targets as broken  |

See [[writing/wikilinks|Wikilinks]].

### Content filters

| Option                    | Default | Description                               |
| ------------------------- | ------- | ----------------------------------------- |
| `filters.removeDrafts`    | `true`  | Exclude pages with `draft: true`          |
| `filters.explicitPublish` | `false` | Require `publish: true` to include a page |

See [[writing/drafts-and-publishing|Drafts and publishing]].

### Authentication

Set `auth: false` to disable, or configure:

```ts
auth: {
  provider: "google",
  allowedDomains: ["example.com"],
  allowedEmails: ["you@example.com"],
}
```

See [[auth|Authentication]] for environment variables and setup.

## Config changes in dev

Editing `silica.config.ts` triggers a full dev server restart. Content-only changes hot-reload without restarting.

