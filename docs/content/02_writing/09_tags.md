---
title: Tags
description: Organize pages with Obsidian-compatible tags.
---

Tags work just like they do in Obsidian. They are case-insensitive, contain no spaces, and can nest with `/`. Each tag gets its own page listing everything that uses it.

## Tags in frontmatter

Add tags to a page with the `tags` key:

```yaml
---
tags:
  - project/active
  - team-notes
---
```

## Inline tags

You can also write tags directly in the body of a note:

```markdown
Discuss the rollout with #project/active.
```

Live example: this page is tagged with #docs/tags.

Silica turns inline tags into links to their tag page. Tags written inside code, links, or comments are ignored.

## Nested tags

Use `/` to group related tags:

```markdown
#project/active
#project/archived
```

A parent tag page includes everything nested under it, so `/tags/project` also lists pages tagged `#project/active`.

## Turning off inline tags

Inline tags are on by default. If you only want tags from frontmatter, set `tags.inline: false`:

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  tags: {
    inline: false,
  },
});
```
