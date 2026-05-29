---
title: Links
description: Connect pages with Obsidian-style wikilinks.
---

Wikilinks are the main way to connect pages in your vault. Write them exactly as you would in Obsidian, and Silica turns them into working links.

## Basic wikilinks

```markdown
[[other-page]]
[[folder/other-page]]
[[other-page|Custom label]]
```

Links you create this way also power the [[features/backlinks|backlinks]] shown at the bottom of each page.

## Linking to a heading or block

Point a link at a specific heading or paragraph using an Obsidian fragment:

```markdown
[[other-page#Install guide]]
[[other-page#^important-block|Important block]]
```

To make a paragraph linkable, add a block ID (a caret and a label) at its end:

```markdown
This paragraph can be linked directly. ^important-block
```

This paragraph is a real, linkable block used by the example below. ^docs-block-link-target

Live examples: [[writing/links#Linking to a heading or block|jump to this heading]] and [[writing/links#^docs-block-link-target|jump to that block]].

Block IDs are useful when a whole heading is too broad but one specific paragraph, list item, or callout should be linkable.

## Choosing how links resolve

Set your preferred matching strategy in `silica.config.ts`:

```ts
wikilinks: {
  strategy: "shortest", // "absolute" | "relative" | "shortest"
  strict: false,
}
```

| Strategy   | Behavior                                 |
| ---------- | ---------------------------------------- |
| `shortest` | Match the shortest unique page (default) |
| `absolute` | Resolve from the vault root              |
| `relative` | Resolve relative to the current page     |

With `strict: true`, a link that could match more than one page is treated as broken so you can fix it.

## Broken links

If a wikilink points at a page that does not exist, Silica renders it as a muted, non-clickable link instead of failing the build. Create the target page or fix the path to resolve it.

## External links

Standard Markdown links to other sites work as usual and open in a new tab:

```markdown
[Shiki](https://shiki.style/)
```

## Embedding instead of linking

Prefix a wikilink with `!` to embed the target — an image, a file, or another page — directly into the current page. See [[writing/embeds-and-assets|Embeds and assets]].
