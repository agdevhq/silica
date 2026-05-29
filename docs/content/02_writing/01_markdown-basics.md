---
title: Markdown basics
description: A quick primer on Markdown for anyone new to it.
---

New to Markdown? It's a simple way to write formatted text in plain files. You add a few symbols to your words, and Silica turns them into headings, lists, links, and more. This page covers the essentials; the rest of this section adds the Obsidian and Silica extras on top.

## Headings

Start a line with `#` symbols. More `#` means a smaller heading.

```markdown
# Page title

## Section

### Subsection
```

Headings also build the page's [[features/table-of-contents|table of contents]].

## Paragraphs and line breaks

Just write text. Leave a blank line between paragraphs:

```markdown
This is one paragraph.

This is another paragraph.
```

## Bold, italic, and strikethrough

```markdown
_italic_ or _italic_
**bold** or **bold**
**_bold italic_**
~~strikethrough~~
```

_italic_, **bold**, **_bold italic_**, and ~~strikethrough~~.

## Lists

Bulleted lists use `-`; numbered lists use `1.`. Indent to nest:

```markdown
- First item
- Second item
  - Nested item

1. Step one
2. Step two
```

- First item
- Second item
  - Nested item

1. Step one
2. Step two

Add `[ ]` or `[x]` for a task list:

```markdown
- [x] Write the page
- [ ] Publish it
```

- [x] Write the page
- [ ] Publish it

## Links and images

```markdown
[Link text](https://example.com)
![Image alt text](images/photo.png)
```

In a Silica vault you'll usually link between your own pages with [[writing/links|wikilinks]] and embed images with [[writing/embeds-and-assets|`![[...]]` embeds]] instead.

## Quotes

Start a line with `>`:

```markdown
> A blockquote.
```

> A blockquote.

Silica also turns special blockquotes into [[writing/callouts|callouts]].

## Inline code and code blocks

Wrap inline code in backticks. For a block, fence it with three backticks:

````markdown
Use the `silica build` command.

```ts
const site = "Silica";
```
````

Use the `silica build` command.

```ts
const site = "Silica";
```

See [[writing/code-and-diagrams|Code and diagrams]] for syntax highlighting and diagrams.

## Horizontal rule

Three dashes on their own line draw a divider:

```markdown
---
```

## Obsidian additions

On top of standard Markdown, Silica understands a few Obsidian inline extras.

Highlight text with double equals:

```markdown
This is ==highlighted== text.
```

This is ==highlighted== text.

Hide private notes with `%%` — they never appear on the page:

```markdown
Visible text. %% This comment is hidden. %%
```

Visible text. %% This comment is hidden. %%

Add a quick aside with an inline footnote:

```markdown
Silica supports inline footnotes.^[This note stays inline in the source.]
```

Silica supports inline footnotes.^[This note stays inline in the source.]

## Where to next

That's the core of Markdown. From here, the rest of this section covers what Silica adds:

- [[writing/frontmatter|Frontmatter]] — page metadata
- [[writing/links|Links]] — connect your pages
- [[writing/callouts|Callouts]] — styled note boxes
- [[writing/tables|Tables]] — rows, columns, and alignment
- [[writing/math|Math]] — inline and block equations
