# @silicajs/core

## 0.2.0

### Minor Changes

- 5525573: Move large navigation data out of per-page render payloads and pass page-local breadcrumb and backlink slices to themes.

## 0.1.2

### Patch Changes

- 5dbfe9f: Replace the FlexSearch JSON artifact with a server-side SQLite FTS database and return structured search result highlights.
- Updated dependencies [5dbfe9f]
  - @silicajs/search@0.2.0

## 0.1.1

### Patch Changes

- 45e8717: Fix Google sign-in flow, add a branded private sign-in page with optional `logo` config, keep auth routes free of the vault sidebar, rebuild the sidebar user menu with avatar and session details, and show a pointer cursor on menu and command items.
- fa2ed69: Use frontmatter descriptions only in the page UI, resolve meta tags from manual or generated plain-text blurbs, and strip markdown formatting from both through a shared cleaner.
