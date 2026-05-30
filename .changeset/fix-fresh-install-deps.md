---
'@silicajs/auth': patch
'@silicajs/next': patch
'@silicajs/ui': patch
---

Fix fresh `npm init silica` installs by pinning better-auth to 1.6.11 (avoids broken kysely 0.29 resolution) and shipping shadcn as a runtime dependency of `@silicajs/ui`.
