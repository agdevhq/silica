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

## Heading and block links

Link to a heading or block inside a page with an Obsidian fragment:

```markdown
[[other-page#Install guide]]
[[other-page#^important-block|Important block]]
```

Heading fragments are converted to the same slug format used by page heading anchors. Block fragments preserve the `#^block-id` anchor.

Live examples: [[markdown/block-links#Block IDs|Block IDs]] and [[markdown/block-links#^docs-block-link-target|a specific block target]].

Define a block ID at the end of a paragraph:

```markdown
This paragraph can be linked directly. ^important-block
```

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
![[images/photo.png|100x145]]
![[other-page]]
```

Supported asset extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `pdf`, `mp4`, `mov`, `mp3`, `wav`, `ogg`, `canvas`.

Image embeds support Obsidian dimensions with `|width` or `|widthxheight`. Non-image media render through the appropriate media element or the theme's embed component. Page embeds render embedded note content when the runtime can resolve the target page.

Live image embed:

![[images/sample.svg|160]]

See [[writing/assets|Assets]] for path details.
