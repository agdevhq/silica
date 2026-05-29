---
title: Block links
description: Obsidian heading fragments and block IDs in wikilinks.
---

Silica supports Obsidian-style links to headings and blocks. These fragments are preserved when wikilinks become internal routes.

## Heading links

Link to a heading with `#Heading text`:

```markdown
[[markdown/block-links#Block IDs]]
```

Live example: [[markdown/block-links#Block IDs|Jump to the Block IDs section]].

Heading fragments are converted to the same slug format used by page heading anchors.

## Block IDs

Add a block ID with a caret:

```markdown
This paragraph can be linked directly. ^important-block
```

This paragraph is a real block target used by the live link below. ^docs-block-link-target

Link to the block with `#^block-id`:

```markdown
[[markdown/block-links#^docs-block-link-target]]
```

Live example: [[markdown/block-links#^docs-block-link-target|Jump to the block target]].

## Notes

Block IDs render as stable anchors. They are useful when a heading is too broad but a specific paragraph, list item, or callout should be linkable.
