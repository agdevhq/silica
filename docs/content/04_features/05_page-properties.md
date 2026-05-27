---
title: Page properties
description: Custom frontmatter fields displayed under the page title.
---

Any frontmatter key that is not reserved by Silica appears in a **Properties** panel under the page header.

## Reserved keys (not shown as properties)

`title`, `menu_label`, `description`, `date`, `created`, `modified`, `draft`, and `publish` are handled internally.

## Example

```yaml
---
title: API reference
description: Endpoint documentation
author: Platform team
version: 2.1
status: stable
---
```

Renders `author`, `version`, and `status` as properties alongside the title and description.

See [[writing/frontmatter|Frontmatter]] for the full list of reserved keys. The [[writing/frontmatter|Frontmatter]] page itself demonstrates custom properties (`featured`, `date`).
