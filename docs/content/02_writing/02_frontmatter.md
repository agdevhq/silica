---
title: Frontmatter
description: The metadata block at the top of each page.
date: 2026-05-25
featured: true
related: "[[writing/links|Links]]"
---

Every page can start with a block of YAML between `---` fences. This is the same frontmatter you already use in Obsidian, and it controls the page title, navigation label, and more.

```yaml
---
title: Authentication Guide
menu_label: Auth
description: Shown under the page title
date: 2026-05-25
draft: true
publish: true
listed: false
---
```

## Built-in keys

These keys have special meaning to Silica:

| Key                    | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `title`                | Page title; falls back to the first heading or the filename     |
| `menu_label`           | Sidebar label; falls back to `title`                            |
| `description`          | Subtitle under the page title; also used for meta tags when set |
| `date`                 | Publication date                                                |
| `created` / `modified` | Timestamps shown with the page                                  |
| `draft`                | Hides the page from the built site (see below)                  |
| `publish`              | Marks a page for publishing in stricter setups                  |
| `listed`               | Set to `false` to keep a page reachable but out of the menu     |
| `tags`                 | Page tags (see [[writing/tags\|Tags]])                          |

When `description` is omitted, the page subtitle is hidden and Silica generates a plain-text meta description from the note body for `<meta>` and social tags. Markdown formatting is stripped from manual descriptions as well.

For how `draft`, `publish`, and `listed` interact, see [[publishing/drafts-and-publishing|Drafts and publishing]].

## Page properties

Any other key you add becomes a **page property**, shown in a small panel under the page title. This is handy for things like an author, a status, or a version.

```yaml
---
title: API reference
description: Endpoint documentation
author: Platform team
owner: "[[teams/platform|Platform team]]"
version: 2.1
status: stable
---
```

That example shows `author`, `owner`, `version`, and `status` beside the title. Wikilinks in page properties are resolved just like body links, so they render as links and count toward backlinks. Quote wikilink values in YAML so the brackets stay part of the string. The built-in keys above are handled by Silica and never duplicated in the panel.

This page is a live example: it sets `featured: true` as a custom property, so you can see it rendered in the properties panel above. The built-in `date` key is not repeated there.
