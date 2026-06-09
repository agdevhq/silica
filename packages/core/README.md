# @silicajs/core

Framework-agnostic Silica core:

- `defineConfig()` / `loadConfig()`
- Quartz-inspired slug and wikilink helpers
- markdown render/analyze pipeline
- precompute artifacts (`manifest.json`, `graph.json`, `search.db`, `cache-state.json`, `route-cache-keys.json`)

This package is consumed by the CLI during precompute and by the generated Next.js runtime when rendering vault content.
