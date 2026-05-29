---
title: Tables
description: Rows, columns, alignment, and escaping pipes in cells.
---

Build a table with pipes (`|`) for columns and a row of dashes to separate the header from the body:

```markdown
| Feature       | Supported |
| ------------- | --------- |
| Tables        | Yes       |
| Strikethrough | ~~Yes~~   |
| Task lists    | Yes       |
```

| Feature       | Supported |
| ------------- | --------- |
| Tables        | Yes       |
| Strikethrough | ~~Yes~~   |
| Task lists    | Yes       |

The outer pipes and the exact spacing are optional — only the header separator row is required.

## Column alignment

Add a colon to the separator row to align a column left, center, or right:

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| a    |   b    |     c |
```

| Left | Center | Right |
| :--- | :----: | ----: |
| a    |   b    |     c |

## Formatting inside cells

Cells accept inline formatting — **bold**, _italic_, `code`, ==highlights==, links, and more.

## Pipes inside cells

A literal `|` inside a cell would otherwise start a new column, so escape it as `\|`. This matters most for wikilinks and embeds, whose `|` separates the target from its alias or size. Inside a table cell, escape that pipe just like in Obsidian:

```markdown
| Item        | Example                    |
| ----------- | -------------------------- |
| Linked page | [[writing/tags\|Tags]]     |
| Sized embed | ![[images/sample.svg\|80]] |
```

| Item        | Example                    |
| ----------- | -------------------------- |
| Linked page | [[writing/tags\|Tags]]     |
| Sized embed | ![[images/sample.svg\|80]] |

Outside of tables you can write wikilinks normally, without escaping: `[[writing/tags|Tags]]`.
