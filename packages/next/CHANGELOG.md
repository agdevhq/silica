# @silicajs/next

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
