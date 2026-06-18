---
"@silicajs/next": patch
---

Bake `SILICA_PROJECT_ROOT` (and optional `SILICA_CACHE_DIR`) into generated `next.config.ts` so serverless hosts like Netlify have vault paths at runtime without filesystem discovery during tracing.
