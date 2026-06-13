# @silicajs/ui

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
