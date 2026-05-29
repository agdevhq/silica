---
title: Math
description: Inline and block equations with LaTeX syntax.
---

Silica renders LaTeX math, so you can drop equations straight into your notes.

## Inline math

Wrap an expression in single dollar signs to keep it in the flow of a sentence:

```markdown
The energy-mass relation is $E = mc^2$.
```

The energy-mass relation is $E = mc^2$.

## Block math

Use double dollar signs for a centered, standalone equation:

```markdown
$$
\int_0^\infty e^{-x^2}\, dx = \frac{\sqrt{\pi}}{2}
$$
```

$$
\int_0^\infty e^{-x^2}\, dx = \frac{\sqrt{\pi}}{2}
$$

Equations use standard LaTeX syntax, so most expressions you know from LaTeX work as-is.
