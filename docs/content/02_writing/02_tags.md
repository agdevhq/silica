---
title: Tags
description: Obsidian-compatible tags in frontmatter and note bodies.
---

Silica follows Obsidian's tag model. Tags are case-insensitive, cannot contain spaces, and support nested paths with `/`.

## Frontmatter tags

Add note-level tags with the `tags` property:

```yaml
---
tags:
  - project/active
  - team-notes
---
```

The deprecated Obsidian `tag` property is also recognized, but `tags` is preferred.

## Inline tags

Write inline tags anywhere in the note body:

```md
Discuss the rollout with #project/active.
```

Silica extracts inline tags into the manifest and renders them as links to tag pages. Inline tags inside code, fenced blocks, comments, URLs, and markdown link destinations are ignored.

## Nested tags

Nested tags use `/`:

```md
#project/active
#project/archived
```

Parent tag pages include nested tags, so `/tags/project` includes pages tagged `#project/active`.

## Configuration

Inline body tags are enabled by default. Set `tags.inline: false` in `silica.config.ts` to only recognize frontmatter tags:

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  tags: {
    inline: false,
  },
});
```
