---
"@silicajs/search": patch
"@silicajs/core": patch
---

Stop the search index build from overwriting `menu_label` (and other note metadata) when upserting into a vault's existing `notes` table. Sidebar labels set via `menu_label` frontmatter are now preserved instead of being replaced by the page title.
