---
title: Welcome to Silica
menu_label: Home
description: Publish entire Markdown vaults with Obsidian-like syntax as polished knowledge sites.
---

Silica turns an entire tree of Markdown files into a fast, beautiful, searchable website. Your folder hierarchy becomes the site's structure, and Silica builds the navigation, search, and links between pages, then gives you a production site to deploy. If you already have an Obsidian vault, your notes work as-is.

> [!tip] New here?
> Get started by [[getting-started/installation|installing Silica]] and running it locally. Then write your content in plain [[writing/markdown-basics|Markdown]], make the site your own through your [[publishing/configuration|configuration]], and [[deployment/overview|deploy it]] when you're ready.

## What you get

- **Write in Markdown** — all your content is plain Markdown, with support for Obsidian-flavored syntax like wikilinks, callouts, embeds, highlights, comments, block links, and tags
- **A connected knowledge graph** — Silica resolves your wikilinks and Markdown links, builds backlinks automatically, and warns about links that don't resolve
- **Built-in full-text search** — every page's title, content, and tags are indexed at build time, behind a ⌘K command palette (and your sign-in, if enabled)
- **A polished reading experience** — sidebar navigation, breadcrumbs, a table of contents, and dark mode out of the box
- **Fast by default** — pages are prerendered to static HTML and cached, so they load instantly
- **SEO-ready** — clean URLs, per-page titles and meta descriptions, and a generated `sitemap.xml` and `robots.txt`
- **Optional AI assistant** — answer reader questions from your own pages, with citations
- **Optional access control** — gate your site behind Google sign-in
- **Deploy your way** — self-host with the included Docker setup or push to a managed platform like Vercel

## Quick example

Your project stays small — you only ever edit Markdown and one config file:

```txt
content/          # your Markdown files
public/           # static files (favicon, etc.)
silica.config.ts  # site settings
package.json
```

Run `silica dev`, edit Markdown, and the site updates as you type:

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "My Knowledge Base",
  description: "Team docs powered by Silica",
  theme: "default",
});
```

This very site is built with Silica — it is just the Markdown in `docs/content/`.

## Where to next

- **Get running** — [[getting-started/installation|Installation]], then learn the [[getting-started/commands|commands]].
- **Write your pages** — start with [[writing/markdown-basics|Markdown basics]] and [[writing/frontmatter|Frontmatter]].
- **Make it yours** — tune everything in [[publishing/configuration|Configuration]].
- **Add an assistant** — let readers ask questions with the [[features/ai-assistant|AI assistant]].
- **Ship it** — pick a path in [[deployment/overview|Deployment]].
