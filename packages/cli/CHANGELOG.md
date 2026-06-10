# @silicajs/cli

## 0.2.1

### Patch Changes

- Updated dependencies [63d14e0]
  - @silicajs/core@0.6.0
  - @silicajs/next@0.3.1

## 0.2.0

### Minor Changes

- cbdf8ca: Add configurable prerender selection with stable vault render hashes, persistent filesystem-backed render caching, and a consolidated SQLite vault database for metadata and search.

### Patch Changes

- Updated dependencies [cbdf8ca]
  - @silicajs/core@0.5.0
  - @silicajs/next@0.3.0

## 0.1.6

### Patch Changes

- fc07754: Speed up large vault builds by indexing wikilinks once, parallelizing markdown precompute analysis, reusing cached Next runtime data during page generation, and supporting Next config overrides from `silica.config.ts`.
- Updated dependencies [fc07754]
  - @silicajs/core@0.4.0
  - @silicajs/next@0.2.2

## 0.1.5

### Patch Changes

- Updated dependencies [605efb3]
  - @silicajs/core@0.3.0
  - @silicajs/next@0.2.1

## 0.1.4

### Patch Changes

- Updated dependencies [5525573]
  - @silicajs/core@0.2.0
  - @silicajs/next@0.2.0

## 0.1.3

### Patch Changes

- a014a0c: Fix fresh scaffold dependency layout and Tailwind source detection for installed themes.
- Updated dependencies [45e8717]
- Updated dependencies [fa2ed69]
- Updated dependencies [a014a0c]
  - @silicajs/core@0.1.1
  - @silicajs/next@0.1.2

## 0.1.2

### Patch Changes

- 5a3dce8: Bump commander to 15.0.0.
- Updated dependencies [b9f62e7]
  - @silicajs/next@0.1.1

## 0.1.1

### Patch Changes

- f4b447f: Fix the published CLI entrypoints so `silica` commands execute after bundling while package exports remain import-safe.
