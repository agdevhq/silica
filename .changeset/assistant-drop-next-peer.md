---
"@silicajs/assistant": patch
---

Remove the `@silicajs/next` peer dependency. Silica sites already receive `@silicajs/next` via CLI materialization, and the peer declaration caused Changesets to major-bump assistant when next crossed a 0.x caret boundary in the same release batch.
