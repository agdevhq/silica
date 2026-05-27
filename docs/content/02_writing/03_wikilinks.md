---
title: Wikilinks
description: Obsidian-style [[links]] and how Silica resolves them.
---

Wikilinks are the primary way to connect pages in a Silica vault.

## Basic syntax

```markdown
[[other-page]]
[[folder/other-page]]
[[other-page|Custom label]]
```

Silica converts wikilinks to internal routes during rendering. The link graph powers [[features/backlinks|backlinks]] at the bottom of each page.

## Resolution strategies

Configure in `silica.config.ts`:

```ts
wikilinks: {
  strategy: "shortest", // "absolute" | "relative" | "shortest"
  strict: false,
}
```

| Strategy   | Behavior                                 |
| ---------- | ---------------------------------------- |
| `shortest` | Match the shortest unique slug (default) |
| `absolute` | Resolve from the vault root              |
| `relative` | Resolve relative to the current page     |

With `strict: true`, ambiguous targets that match multiple slugs are treated as broken links.

## Broken links

Unresolved wikilinks render as `<span class="silica-broken-link">` and are recorded in `graph.json` during precompute. Fix them by creating the target page or adjusting the link path.

## Embeds

Asset wikilinks embed files directly:

```markdown
![[images/diagram.svg]]
![[images/photo.png|Alt text]]
```

Supported extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `pdf`, `mp4`, `mov`, `mp3`, `wav`, `ogg`.

See [[writing/assets|Assets]] for path details.
