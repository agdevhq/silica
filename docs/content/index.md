---
title: Welcome to Silica
menu_label: Home
description: Publish Obsidian-flavored markdown vaults as polished websites.
---

Silica turns a folder of Markdown files into a fast, searchable website. You keep writing in Obsidian-style syntax; Silica handles the navigation, search, links between pages, and hosting.

> [!tip] New here?
> Start with [[getting-started/installation|Installation]], write your first page with [[writing/frontmatter|Frontmatter]], then tune the site in [[publishing/configuration|Configuration]].

## What you get

- **Obsidian syntax** — wikilinks, callouts, embeds, highlights, comments, block links, and tags
- **A polished reading experience** — sidebar navigation, full-text search, table of contents, and backlinks
- **Dark mode** out of the box
- **Optional access control** — gate your site behind Google sign-in
- **Self-hosting** — deploy anywhere that runs a Node container

## Quick example

Your project stays small — you only ever edit Markdown and one config file:

```txt
content/          # your Markdown vault
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

This very site is a Silica vault — it is the Markdown in `docs/content/`, published with Silica.

## Documentation map

### Getting started

- [[getting-started/installation|Installation]]
- [[getting-started/project-structure|Project structure]]
- [[getting-started/commands|Commands]]

### Writing content

- [[writing/markdown-basics|Markdown basics]]
- [[writing/frontmatter|Frontmatter and page properties]]
- [[writing/links|Links]]
- [[writing/embeds-and-assets|Embeds and assets]]
- [[writing/callouts|Callouts]]
- [[writing/code-and-diagrams|Code and diagrams]]
- [[writing/tables|Tables]]
- [[writing/math|Math]]
- [[writing/tags|Tags]]

### Site features

- [[features/navigation|Navigation]]
- [[features/search|Search]]
- [[features/backlinks|Backlinks]]
- [[features/table-of-contents|Table of contents]]

### Publishing

- [[publishing/drafts-and-publishing|Drafts and publishing]]
- [[publishing/configuration|Configuration]]
- [[publishing/authentication|Authentication]]
- [[publishing/deployment|Deployment]]

### Under the hood

- [[how-it-works|How Silica works]]
