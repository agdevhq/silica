---
title: Navigation
description: The sidebar tree, breadcrumbs, and page ordering.
---

## Sidebar tree

The sidebar shows a collapsible tree of your vault. Each Markdown file is a page, and each folder is an expandable group. Folders sort alphabetically with subfolders first, and the tree remembers what you expanded.

| File                      | Where it appears in the tree            |
| ------------------------- | --------------------------------------- |
| `content/index.md`        | The home link at the top                |
| `content/guides/setup.md` | `guides` → `setup`                      |
| `content/guides/index.md` | makes the `guides` folder clickable too |

## Controlling the order

By default, a leading number on a file or folder is used only for ordering — it is stripped from the URL and the sidebar label:

| File                             | URL / label                 |
| -------------------------------- | --------------------------- |
| `content/01_Home.md`             | `/home` / `Home`            |
| `content/02_Guides/01_Setup.md`  | `/guides/setup` / `Setup`   |
| `content/02_Guides/02_Deploy.md` | `/guides/deploy` / `Deploy` |

This documentation uses exactly that trick — the folders are named `01_getting-started`, `02_writing`, and so on, which is why they appear in this order.

If you would rather keep the numbers in your URLs, turn this off in `silica.config.ts`:

```ts
export default defineConfig({
  ordering: {
    numericPrefixes: false,
  },
});
```

## Breadcrumbs

Pages inside folders show breadcrumbs above the title so readers know where they are. A breadcrumb links only when that folder is itself a page. The home page has no breadcrumbs.

## On mobile

On small screens the sidebar tucks behind a button in the header, and search stays one tap away.
