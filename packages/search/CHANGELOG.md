# @silicajs/search

## 0.3.2

### Patch Changes

- 97f999f: Stop the search index build from overwriting `menu_label` (and other note metadata) when upserting into a vault's existing `notes` table. Sidebar labels set via `menu_label` frontmatter are now preserved instead of being replaced by the page title.
- beb0e75: Bump better-sqlite3 to 12.11.1.

## 0.3.1

### Patch Changes

- 63d14e0: Resolve Obsidian-style asset embeds by filename when an attachment path is unambiguous.

## 0.3.0

### Minor Changes

- cbdf8ca: Add configurable prerender selection with stable vault render hashes, persistent filesystem-backed render caching, and a consolidated SQLite vault database for metadata and search.

## 0.2.0

### Minor Changes

- 5dbfe9f: Replace the FlexSearch JSON artifact with a server-side SQLite FTS database and return structured search result highlights.
