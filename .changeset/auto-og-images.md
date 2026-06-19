---
"@silicajs/next": minor
---

Generate Open Graph (`og:image`) preview images for every note automatically, GitHub-style. A new `/api/silica/og/[[...slug]]` route renders a branded 1200×630 card from each note's title, description, and tags, and the page/layout metadata now wires `og:image` and `twitter:image` (with `metadataBase` derived from `baseUrl`).
