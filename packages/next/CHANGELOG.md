# @silicajs/next

## 0.3.1

### Patch Changes

- 63d14e0: Resolve Obsidian-style asset embeds by filename when an attachment path is unambiguous.
- Updated dependencies [63d14e0]
  - @silicajs/core@0.6.0
  - @silicajs/search@0.3.1
  - @silicajs/components@0.2.4

## 0.3.0

### Minor Changes

- cbdf8ca: Add configurable prerender selection with stable vault render hashes, persistent filesystem-backed render caching, and a consolidated SQLite vault database for metadata and search.

### Patch Changes

- Updated dependencies [cbdf8ca]
  - @silicajs/core@0.5.0
  - @silicajs/search@0.3.0
  - @silicajs/components@0.2.3

## 0.2.2

### Patch Changes

- fc07754: Speed up large vault builds by indexing wikilinks once, parallelizing markdown precompute analysis, reusing cached Next runtime data during page generation, and supporting Next config overrides from `silica.config.ts`.
- Updated dependencies [fc07754]
  - @silicajs/core@0.4.0
  - @silicajs/components@0.2.2

## 0.2.1

### Patch Changes

- 605efb3: Use manifest metadata as the page source of truth and fall back to note file names for missing titles.
- Updated dependencies [605efb3]
  - @silicajs/core@0.3.0
  - @silicajs/components@0.2.1

## 0.2.0

### Minor Changes

- 5525573: Move large navigation data out of per-page render payloads and pass page-local breadcrumb and backlink slices to themes.

### Patch Changes

- Updated dependencies [5525573]
  - @silicajs/core@0.2.0
  - @silicajs/components@0.2.0

## 0.1.3

### Patch Changes

- 5dbfe9f: Replace the FlexSearch JSON artifact with a server-side SQLite FTS database and return structured search result highlights.
- Updated dependencies [5dbfe9f]
  - @silicajs/search@0.2.0
  - @silicajs/core@0.1.2
  - @silicajs/components@0.1.3

## 0.1.2

### Patch Changes

- 45e8717: Fix Google sign-in flow, add a branded private sign-in page with optional `logo` config, keep auth routes free of the vault sidebar, rebuild the sidebar user menu with avatar and session details, and show a pointer cursor on menu and command items.
- fa2ed69: Use frontmatter descriptions only in the page UI, resolve meta tags from manual or generated plain-text blurbs, and strip markdown formatting from both through a shared cleaner.
- a014a0c: Fix fresh scaffold dependency layout and Tailwind source detection for installed themes.
- Updated dependencies [45e8717]
- Updated dependencies [fa2ed69]
- Updated dependencies [ccc9c98]
  - @silicajs/core@0.1.1
  - @silicajs/components@0.1.2

## 0.1.1

### Patch Changes

- b9f62e7: Fix fresh `npm init silica` installs by pinning better-auth to 1.6.11 (avoids broken kysely 0.29 resolution) and shipping shadcn as a runtime dependency of `@silicajs/ui`.
- Updated dependencies [b9f62e7]
  - @silicajs/auth@0.1.1
