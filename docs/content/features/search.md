---
title: Search
description: Server-side FlexSearch with a command palette UI.
---

Silica builds a FlexSearch index during precompute and serves queries through a server API — the full index never ships to the browser.

## Using search

Open the command palette from the sidebar search button or press **⌘K** (Ctrl+K on Windows/Linux).

Results include page title and excerpt. Selecting a result navigates to that page.

## How it works

1. **Precompute** — `@silicajs/search` indexes title and content into `search-index.json`
2. **API route** — `/api/search` loads the index lazily and returns ranked results
3. **UI** — `SearchTrigger` and `SearchPalette` from `@silicajs/components`

## Privacy

Because search runs server-side, private vault content stays off the client. When auth is enabled, the proxy gates `/api/search` along with pages and assets.

## Indexed fields

By default, each page record includes:

- `title`
- Plain-text content (markdown stripped)
