---
"@silicajs/next": patch
---

Declare fs-extra as a dependency. The filesystem cache handler imports it, but it was previously only available through a hoisted transitive dependency.
