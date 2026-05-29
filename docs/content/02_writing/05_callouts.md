---
title: Callouts
description: Highlight notes, tips, and warnings with Obsidian callouts.
---

Callouts are styled boxes for notes, tips, warnings, and more. Write them as a blockquote with a type marker, exactly like in Obsidian:

```markdown
> [!note] Title
> Body content here.
```

## Foldable callouts

Add `-` to start collapsed, or `+` to start expanded:

```markdown
> [!faq]- Collapsed by default
> Click the title to expand.

> [!tip]+ Open by default
> Starts expanded, can be collapsed.
```

## Available types

Each type has its own color and icon. Several names are aliases that share a look.

### Notes and info

> [!note] Note
> Use notes for neutral information.

> [!abstract] Abstract
> Use abstracts, summaries, or TLDRs to compress longer content. `summary` and `tldr` are aliases.

> [!info] Info
> Use info callouts for helpful context.

> [!todo] Todo
> Use todos for tasks or pending work.

### Tips and success

> [!tip] Tip
> Use tips for recommendations. `hint` and `important` are aliases.

> [!success] Success
> Use success callouts for positive outcomes. `check` and `done` are aliases.

### Questions and warnings

> [!question] Question
> Use questions for prompts or open issues. `help` and `faq` are aliases.

> [!warning] Warning
> Use warnings for content that needs attention. `caution` and `attention` are aliases.

### Errors and examples

> [!failure] Failure
> Use failures for errors or missing work. `fail` and `missing` are aliases.

> [!danger] Danger
> Use danger callouts for severe or destructive outcomes. `error` is an alias.

> [!bug] Bug
> Use bug callouts for defects.

> [!example] Example
> Use examples for concrete snippets or demonstrations.

> [!quote] Quote
> Use quotes for citations or excerpts. `cite` is an alias.

## Custom types

> [!custom-type] Custom type
> An unknown type still renders — it keeps its name and falls back to the note styling.
