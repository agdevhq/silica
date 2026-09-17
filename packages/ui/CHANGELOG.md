# @silicajs/ui

## 0.2.2

### Patch Changes

- b7c4556: Bump lucide-react to 1.45.0, zod to 4.6.5, better-auth to 1.7.4, @next/env to 16.3.5, katex to 0.18.7, tailwind-merge to 3.7.0.
- 889ccc7: Bump just-bash to 3.4.2, lucide-react to 1.43.0, zod to 4.6.1, better-auth to 1.6.30, @next/env to 16.3.4, fs-extra to 11.4.0, @shikijs/rehype to 4.4.3, shiki to 4.4.3, @base-ui/react to 1.8.0, react-resizable-panels to 4.12.4.

## 0.2.1

### Patch Changes

- eb55665: Bump lucide-react to 1.21.0.

## 0.2.0

### Minor Changes

- 473d120: Add resizable panel primitives used by the assistant conversation sidebar and available to other Silica UI integrations.

## 0.1.3

### Patch Changes

- d896c1f: Polish the search palette layout with a larger input, roomier results, and keyboard hints.

## 0.1.2

### Patch Changes

- 45e8717: Fix Google sign-in flow, add a branded private sign-in page with optional `logo` config, keep auth routes free of the vault sidebar, rebuild the sidebar user menu with avatar and session details, and show a pointer cursor on menu and command items.
- 040ca54: Inline shadcn Tailwind utilities into the UI stylesheet and keep shadcn as development tooling only.
- ccc9c98: Bump lucide-react to 1.17.0.
- 7d65239: Bump shadcn to 4.10.0.

## 0.1.1

### Patch Changes

- b9f62e7: Fix fresh `npm init silica` installs by pinning better-auth to 1.6.11 (avoids broken kysely 0.29 resolution) and shipping shadcn as a runtime dependency of `@silicajs/ui`.
