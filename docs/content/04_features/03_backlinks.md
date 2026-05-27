---
title: Backlinks
description: Automatic link graph from wikilinks and internal links.
---

Every page shows a **Backlinks** section at the bottom when other pages link to it. Silica builds the link graph during precompute from wikilinks and internal markdown links.

This page is linked from [[index|Silica home]] — you should see those backlinks below.

The graph also tracks broken links in `graph.json` for debugging unresolved wikilinks.

## Link types

Both of these contribute to the graph:

- Wikilinks: `\[\[other-page\]\]`
- Standard internal links: `[text](/other-page)`

External links open in a new tab with `rel="noreferrer noopener"`.
