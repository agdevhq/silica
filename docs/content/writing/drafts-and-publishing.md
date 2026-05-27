---
title: Drafts and publishing
description: Control which pages appear in the built site.
---

Silica filters pages during precompute based on frontmatter and config.

## Drafts

Set `draft: true` in frontmatter to exclude a page:

```yaml
---
title: Work in progress
draft: true
---
```

By default, `filters.removeDrafts` is `true` in `silica.config.ts`. Draft pages are omitted from the manifest, search index, and navigation.

This vault includes `content/drafts/hidden.md` as a draft example — it will not appear on the site.

## Explicit publish

For stricter workflows, enable explicit publishing:

```ts
filters: {
  removeDrafts: true,
  explicitPublish: true,
}
```

With `explicitPublish: true`, only pages with `publish: true` are included. Everything else is excluded regardless of draft status.

## When to use which

| Mode                          | Best for                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| Default (`removeDrafts` only) | Obsidian-style drafts — most teams                              |
| `explicitPublish`             | Staging content that should never leak without an explicit flag |

Configure filters in [[configuration|Configuration]].

