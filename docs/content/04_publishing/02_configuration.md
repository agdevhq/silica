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
| `baseUrl`     | —                           | Your public URL, used for the sitemap and sign-in |
| `contentDir`  | `"content"`                 | Folder that holds your Markdown vault             |
| `theme`       | `"default"`                 | The site theme                                    |

## Links

| Option               | Default      | What it does                                |
| -------------------- | ------------ | ------------------------------------------- |
| `wikilinks.strategy` | `"shortest"` | `"shortest"`, `"absolute"`, or `"relative"` |
| `wikilinks.strict`   | `false`      | Treat ambiguous links as broken             |

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
