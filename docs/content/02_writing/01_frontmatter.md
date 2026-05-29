---
title: Frontmatter
description: YAML metadata at the top of each markdown file.
date: 2026-05-25
featured: true
---

Silica reads Obsidian-style YAML front matter between `---` fences at the top of each markdown file.

```yaml
---
title: Authentication and Authorization Guide
menu_label: Auth
description: Used for meta tags and page headers
date: 2026-05-25
created: 2026-05-20
modified: 2026-05-25
draft: true
publish: true
listed: false
---
```

## Reserved keys

| Key                    | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `title`                | Page title; falls back to the first heading or filename   |
| `menu_label`           | Sidebar label; falls back to `title` when omitted         |
| `description`          | Meta description and subtitle under the page title        |
| `date`                 | Publication date; used when `created` is missing          |
| `created` / `modified` | Stored in the manifest; git history is a fallback         |
| `draft: true`          | Excluded when `removeDrafts` is enabled (default)         |
| `publish: true`        | Required when `explicitPublish` is enabled                |
| `listed: false`        | Routable but omitted from navigation, search, and sitemap |

## Page properties

Any other YAML keys become **page properties** rendered under the title. Reserved keys are handled by Silica and are not shown again in the properties panel.

This page sets `featured: true` as a custom property; `date` is reserved and is not duplicated in the panel.
