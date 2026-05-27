---
title: Math and GFM
description: KaTeX equations and GitHub-flavored markdown extensions.
---

## Math (KaTeX)

Inline math uses single dollar signs:

```markdown
The energy-mass relation is $E = mc^2$.
```

The energy-mass relation is $E = mc^2$.

Block equations use double dollar signs:

```markdown
$$
\int_0^\infty e^{-x^2}\, dx = \frac{\sqrt{\pi}}{2}
$$
```

$$
\int_0^\infty e^{-x^2}\, dx = \frac{\sqrt{\pi}}{2}
$$

KaTeX CSS is included by the generated Next.js layout.

## GitHub-flavored markdown

Silica enables GFM via `remark-gfm`:

### Tables

| Feature       | Supported |
| ------------- | --------- |
| Tables        | Yes       |
| Strikethrough | ~~Yes~~   |
| Task lists    | Yes       |
| Autolinks     | Yes       |

### Task lists

- [x] Read the [[getting-started/installation|Installation]] guide
- [x] Configure [[configuration|silica.config.ts]]
- [ ] Deploy with [[deployment|Deployment]]

### Strikethrough

Use `~~text~~` for ~~strikethrough~~.

## Highlights

Obsidian-style highlights use double equals:

```markdown
This is ==highlighted== text.
```

This is ==highlighted== text.

## Comments

Obsidian comments are stripped during rendering:

```markdown
%% This will not appear in the output %%
```

