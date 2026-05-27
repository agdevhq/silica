---
title: Silica
description: Publish Obsidian-flavored markdown vaults as polished websites.
---

Silica turns a collection of Markdown files into a server-rendered knowledge site. You write content in Obsidian-style syntax; Silica handles routing, search, backlinks, and the Next.js runtime.

> [!tip] New here?
> Start with [[getting-started/installation|Installation]], then read [[writing/frontmatter|Frontmatter]] and [[configuration|Configuration]].

## What you get

- **Obsidian syntax** — wikilinks, callouts, highlights, and embedded assets
- **Next.js 16** — server-rendered pages with caching
- **Built-in UI** — sidebar navigation, search, table of contents, backlinks, and dark mode
- **Optional auth** — Google OAuth enforced before content is served
- **Self-hosting** — standalone Docker output for Railway, Fly.io, or plain Node

## Quick example

Your project stays small:

```txt
content/
public/
silica.config.ts
package.json
```

Run `silica dev` and edit markdown. Silica materializes the full Next.js app, precomputes the manifest and search index, and hot-reloads on content changes.

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "My Knowledge Base",
  description: "Team docs powered by Silica",
  theme: "default",
});
```

## Documentation map

### Getting started

- [[getting-started/installation|Installation]]
- [[getting-started/project-structure|Project structure]]
- [[getting-started/commands|Commands]]

### Writing content

- [[writing/frontmatter|Frontmatter]]
- [[writing/wikilinks|Wikilinks]]
- [[writing/assets|Assets]]
- [[writing/drafts-and-publishing|Drafts and publishing]]

### Markdown

- [[markdown/callouts|Callouts]]
- [[markdown/code-blocks|Code blocks]]
- [[markdown/math-and-gfm|Math and GFM]]

### Configuration and deployment

- [[configuration|Configuration]]
- [[auth|Authentication]]
- [[deployment|Deployment]]
- [[architecture|Architecture]]

### Site features

- [[features/navigation|Navigation]]
- [[features/search|Search]]
- [[features/backlinks|Backlinks]]
- [[features/table-of-contents|Table of contents]]
- [[features/page-properties|Page properties]]
