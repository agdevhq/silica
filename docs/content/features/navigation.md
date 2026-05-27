---
title: Navigation
description: Vault tree sidebar and breadcrumb navigation.
---

## Vault tree

The sidebar shows a collapsible tree built from your content folder structure. Each markdown file becomes a page; folders become expandable groups.

### How slugs map to the tree

| File                      | Tree position                            |
| ------------------------- | ---------------------------------------- |
| `content/index.md`        | Home link at the top                     |
| `content/guides/setup.md` | `guides` → `setup`                       |
| `content/guides/index.md` | `guides` folder is also a clickable page |

Folders sort alphabetically, with subfolders before leaf pages. Expansion state persists in `localStorage`.

### Organizing docs

Use nested folders to create sections — this documentation site follows the same pattern:

```txt
content/
├── getting-started/
│   ├── installation.md
│   └── commands.md
├── configuration.md
└── features/
    └── search.md
```

Avoid folders that only contain an `index.md` with no sibling pages. Prefer a single file at the vault root (e.g. `configuration.md`) or a folder with multiple real pages.

## Layout overview

```txt
┌─────────────────────────────────────────────────────┐
│ Sidebar          │  Page                    │ ToC    │
│ ─────────        │  ────                    │ ───    │
│ Site title       │  Breadcrumbs             │ H2     │
│ Search (⌘K)      │  Title + description     │ H3     │
│ Vault tree       │  Content                 │        │
│ Dark mode        │  Backlinks               │        │
│ User menu (auth) │                          │        │
└─────────────────────────────────────────────────────┘
```

## Breadcrumbs

Pages nested under folders show breadcrumbs above the title (e.g. `features / search`). The home page omits breadcrumbs.

## Mobile

On small screens, the sidebar collapses behind a trigger in the top header. Search and navigation remain accessible.
