---
title: Mermaid
description: Mermaid diagrams in fenced code blocks.
---

Silica detects Mermaid code fences and renders them through the theme's `silica-mermaid` component.

## Syntax

Use a fenced code block with the `mermaid` language:

````markdown
```mermaid
graph TD
  Markdown --> Obsidian
  Obsidian --> Silica
  Silica --> Website
```
````

## Rendered example

```mermaid
graph TD
  Markdown --> Obsidian
  Obsidian --> Silica
  Silica --> Website
```

The default theme currently shows a source fallback. Themes can override `silica-mermaid` to render diagrams client-side.
