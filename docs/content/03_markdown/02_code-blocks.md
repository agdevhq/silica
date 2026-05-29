---
title: Code blocks
description: Syntax highlighting with Shiki and themed code chrome.
---

Fenced code blocks are highlighted with [Shiki](https://shiki.style/) and wrapped in a `<silica-code-block>` element for theme styling.

## Basic fences

````markdown
```ts
const site = "Silica";
console.log(site);
```
````

Renders as:

```ts
const site = "Silica";
console.log(site);
```

## Language labels

When a language is recognized, the theme shows a label in the code block header (e.g. "TypeScript" for `ts`). Plain text fences without a language tag still render but hide the label.

## Supported languages

Shiki supports a wide range of grammars. Common aliases include:

| Alias                  | Label        |
| ---------------------- | ------------ |
| `ts`, `typescript`     | TypeScript   |
| `js`, `javascript`     | JavaScript   |
| `tsx`, `jsx`           | TSX / JSX    |
| `py`, `python`         | Python       |
| `bash`, `sh`, `shell`  | Shell        |
| `json`, `yaml`, `toml` | Data formats |
| `md`, `markdown`       | Markdown     |

## Light and dark themes

Code blocks use `github-light` and `github-dark` Shiki themes, switching automatically with the site dark mode toggle.

## Mermaid diagrams

Mermaid fences are detected separately from regular code blocks and rendered through a `<silica-mermaid>` component. See [[markdown/mermaid|Mermaid]] for the dedicated page and live example.

## Custom themes

Themes can override the `silica-code-block` component to change code block chrome while keeping Shiki highlighting. They can also override `silica-mermaid` for diagram rendering. See the amethyst theme for examples.
