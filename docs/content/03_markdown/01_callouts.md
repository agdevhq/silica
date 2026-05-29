---
title: Callouts
description: Obsidian callout types and aliases rendered by Silica.
---

Obsidian callouts use blockquote syntax with a type marker:

```markdown
> [!note] Title
> Body content here.
```

Silica transforms them into `<silica-callout>` elements. The default theme maps each type to styled components.

## Foldable callouts

```markdown
> [!faq]- Collapsed by default
> Use `-` after the type for foldable, collapsed callouts.

> [!tip]+ Open by default
> Use `+` for foldable callouts that start expanded.
```

## Supported types

### Note and info

> [!note] Note
> Use notes for neutral information.

> [!abstract] Abstract
> Use abstracts, summaries, or TLDRs to compress longer content.

> [!summary] Summary alias
> `summary` uses the same visual treatment as `abstract`.

> [!tldr] TLDR alias
> `tldr` also maps to the abstract callout.

> [!info] Info
> Use info callouts for helpful context.

> [!todo] Todo
> Use todos for tasks or pending work.

### Tips and success

> [!tip] Tip
> Use tips for recommendations.

> [!hint] Hint alias
> `hint` maps to the tip callout.

> [!important] Important alias
> `important` maps to the tip callout.

> [!success] Success
> Use success callouts for completed or positive outcomes.

> [!check] Check alias
> `check` maps to the success callout.

> [!done] Done alias
> `done` maps to the success callout.

### Questions and warnings

> [!question] Question
> Use questions for prompts or open issues.

> [!help] Help alias
> `help` maps to the question callout.

> [!faq] FAQ alias
> `faq` maps to the question callout.

> [!warning] Warning
> Use warnings for content that needs attention.

> [!caution] Caution alias
> `caution` maps to the warning callout.

> [!attention] Attention alias
> `attention` maps to the warning callout.

### Errors and examples

> [!failure] Failure
> Use failures for errors, missing work, or failed checks.

> [!fail] Fail alias
> `fail` maps to the failure callout.

> [!missing] Missing alias
> `missing` maps to the failure callout.

> [!danger] Danger
> Use danger callouts for severe or destructive outcomes.

> [!error] Error alias
> `error` maps to the danger callout.

> [!bug] Bug
> Use bug callouts for defects.

> [!example] Example
> Use examples for concrete snippets or demonstrations.

> [!quote] Quote
> Use quotes for citations or excerpts.

> [!cite] Cite alias
> `cite` maps to the quote callout.

## Custom types

> [!custom-type] Custom type
> Unknown callout types keep their original `data-callout` value and use the default note styling.

## Other Obsidian syntax

| Syntax          | Result                                     |
| --------------- | ------------------------------------------ |
| `==highlight==` | Highlighted text                           |
| `%% comment %%` | Comments stripped from output              |
| `^block-id`     | Stable block anchor target                 |
| `^[note]`       | Inline footnote                            |
| `# Heading`     | Headings with anchor links and ToC entries |

See also [[markdown/obsidian-flavored-markdown|Other Obsidian syntax]] for highlights, comments, inline tags, and inline footnotes, and [[markdown/math-and-gfm|Math and GFM]] for equations and tables.
