---
title: Other Obsidian syntax
description: Highlights, comments, inline tags, and inline footnotes supported by Silica.
---

Silica parses Obsidian-flavored Markdown as part of the markdown pipeline. Larger features have their own pages:

- [[writing/wikilinks|Wikilinks]]
- [[writing/assets|Embeds and assets]]
- [[markdown/callouts|Callouts]]
- [[markdown/block-links|Block links]]
- [[markdown/mermaid|Mermaid]]

This page covers the smaller inline features. It intentionally uses the live syntax so the docs vault exercises the implementation.

## Highlights

Use double equals for highlighted text:

```markdown
This is ==highlighted== text.
```

Rendered example: This is ==highlighted== text.

## Comments

Wrap private notes with `%%` to keep them out of rendered pages:

```markdown
Visible text. %% This comment is hidden. %%
```

Rendered example: Visible text. %% This comment is hidden. %%

Comments are also ignored when Silica extracts inline tags from note bodies.

## Inline tags

Inline body tags are extracted into the manifest and rendered as tag links:

```markdown
This page is tagged with #docs/ofm.
```

Rendered example: This page is tagged with #docs/ofm.

## Inline footnotes

Use Obsidian inline footnotes for short notes:

```markdown
Silica supports inline footnotes.^[This note stays inline in the source.]
```

Rendered example: Silica supports inline footnotes.^[This note stays inline in the source.]

The inline note renders as a numbered footnote reference in the sentence, with the note body collected in the page footnotes section.

## Standard Markdown Extensions

Silica also enables:

- [[markdown/math-and-gfm|GitHub-flavored Markdown]] for tables, task lists, strikethrough, autolinks, and reference footnotes.
- [[markdown/math-and-gfm|Math]] for inline and block equations.
- [[markdown/callouts|Callouts]] for Obsidian blockquote callouts.
