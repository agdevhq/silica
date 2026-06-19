# @silicajs/assistant

## 0.2.0

### Minor Changes

- aaa7a80: Generate self-contained Next.js apps with runtime data, package dependencies, and build roots contained inside `.silica/next`.

### Patch Changes

- eb55665: Bump lucide-react to 1.21.0.
- Updated dependencies [eb55665]
- Updated dependencies [97f999f]
- Updated dependencies [aaa7a80]
- Updated dependencies [beb0e75]
  - @silicajs/components@0.4.1
  - @silicajs/ui@0.2.1
  - @silicajs/core@0.9.0

## 0.1.0

### Minor Changes

- 473d120: Add the optional AI assistant runtime. The new `@silicajs/assistant` package answers reader questions from generated markdown runtime content with citations and multi-turn conversations, signs client-held transcript turns with `SILICA_ASSISTANT_SECRET`, resolves citations from the vault database, supports provider package/factory/env/secret mappings, and includes built-in request limits.

### Patch Changes

- a1e4c0d: Remove the `@silicajs/next` peer dependency. Silica sites already receive `@silicajs/next` via CLI materialization, and the peer declaration caused Changesets to major-bump assistant when next crossed a 0.x caret boundary in the same release batch.
- Updated dependencies [473d120]
- Updated dependencies [473d120]
- Updated dependencies [473d120]
  - @silicajs/components@0.4.0
  - @silicajs/core@0.8.0
  - @silicajs/ui@0.2.0
