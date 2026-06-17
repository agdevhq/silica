---
"@silicajs/next": patch
---

Resolve relative `SILICA_PROJECT_ROOT` values against the process cwd so serverless hosts like Netlify can point at monorepo docs without filesystem discovery during tracing.
