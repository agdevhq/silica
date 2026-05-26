---
title: Frontmatter notes
description: YAML metadata at the top of each note.
tags: [guide, metadata]
date: 2026-05-24
created: 2026-05-24
modified: 2026-05-25
featured: true
related_topics: [metadata, obsidian]
example_custom_key: arbitrary values become page properties
---

Silica reads Obsidian-style YAML front matter between `---` fences at the top of each markdown file.

```yaml
---
title: Page title
description: Used for meta tags and page headers
tags: [guide, silica]
date: 2026-05-25
created: 2026-05-20
modified: 2026-05-25
draft: true
publish: true
---
```

## Common keys

| Key                    | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `title`                | Page title; falls back to the first heading or filename   |
| `description`          | Meta description and the subtitle under the page title    |
| `tags`                 | Tag pages at `/tags/<tag>`                                |
| `date`                 | Publication date; also used when `created` is missing     |
| `created` / `modified` | Stored in the manifest; git history is used as a fallback |
| `draft: true`          | Excluded from the site when `removeDrafts` is enabled     |
| `publish: true`        | Required when `explicitPublish` is enabled                |

## Page properties

Any other YAML keys are treated as page properties and rendered under the page title. Reserved keys like `title`, `description`, `tags`, `date`, `created`, `modified`, `draft`, and `publish` are handled by Silica itself and are not shown again in the properties panel.

Return to [[index|Welcome to Silica]].
