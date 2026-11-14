---
"@silicajs/next": patch
"@silicajs/core": patch
---

Stop exposing the sitemap on auth-gated sites. The auth proxy no longer treats `/sitemap.xml` as a public path, and when auth is enabled the build skips the generated sitemap and writes a `Disallow: /` robots.txt with no sitemap link. Before this change, anyone without a session could read `/sitemap.xml` and get the slug of every page on a private site.
