---
title: Drafts and publishing
description: Control which pages show up on the built site.
---

Frontmatter and a couple of config options decide which pages make it onto your published site.

## Drafts

Mark a page as a draft to keep it out of the site entirely:

```yaml
---
title: Work in progress
draft: true
---
```

Draft pages are left out of navigation, search, and the sitemap. This is on by default. This vault includes `content/drafts/hidden.md` as a draft, which is why it never appears on the site.

## Unlisted pages

Set `listed: false` when a page should stay reachable and embeddable, but should not show up in the sidebar, search, or sitemap:

```yaml
---
title: Embed helper
listed: false
---
```

This is handy for small helper pages — like the note this vault embeds on the [[writing/embeds-and-assets|Embeds and assets]] page. Use `draft: true` instead when the page should be excluded completely.

## Explicit publishing

For a stricter workflow, require every page to opt in. Turn on explicit publishing in `silica.config.ts`:

```ts
filters: {
  explicitPublish: true,
}
```

Now only pages with `publish: true` are included; everything else is held back. This is useful when staging content that must never go live by accident.

## Which one to use

| You want…                                         | Use               |
| ------------------------------------------------- | ----------------- |
| Obsidian-style drafts (most people)               | `draft: true`     |
| A page that is linkable/embeddable but not listed | `listed: false`   |
| Nothing live unless explicitly flagged            | `explicitPublish` |

These options live in [[publishing/configuration|Configuration]].
