---
"@silicajs/cli": patch
"@silicajs/create": patch
"create-silica": patch
---

Fix the published CLI entrypoints so `silica` commands execute after bundling while package exports remain import-safe.
