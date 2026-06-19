---
title: Social images
description: Automatic Open Graph preview images for every note.
---

Silica generates an Open Graph (`og:image`) preview for every note automatically, the same way GitHub creates preview cards for repositories, issues, and pull requests. When someone shares a link to your site on Slack, X/Twitter, Discord, LinkedIn, or in an iMessage, the unfurled card shows a branded image built from that note's title and description.

## How it works

Each note's metadata points at a generated image route:

```html
<meta
  property="og:image"
  content="https://docs.example.com/api/silica/og/getting-started/installation"
/>
```

That route renders a 1200×630 PNG on demand and caches it, so there is nothing to commit and nothing to keep in sync. Edit a note's title or description and the next request regenerates the card. The image includes:

- Your site title (from `title` in `silica.config.ts`)
- The note title
- The note description (from frontmatter or the auto-generated summary)
- Up to four of the note's tags
- Your domain (from `baseUrl`)

## Make previews absolute

Crawlers require an absolute image URL. Set `baseUrl` to your public origin so the generated `og:image` resolves correctly:

```ts
export default defineConfig({
  baseUrl: "https://docs.example.com",
});
```

See [[publishing/configuration|Configuration]].

## Private vaults

When [[publishing/authentication|authentication]] is enabled, the image route is protected like the rest of your content, so a private vault does not leak note titles or descriptions in link previews.
