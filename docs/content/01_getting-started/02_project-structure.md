---
title: Project structure
description: What you edit, and how files become pages.
---

## Your project

```txt
my-vault/
├── content/              # Markdown vault — you edit this
│   ├── index.md          # Home page at /
│   ├── guides/
│   │   └── setup.md      # Page at /guides/setup
│   └── images/
│       └── diagram.svg   # Assets used by your pages
├── public/               # Static files served at the site root
│   └── favicon.svg
├── silica.config.ts      # Site settings
├── package.json
├── .env                  # Secrets (not committed)
└── .silica/              # Generated — add this to .gitignore
```

You only ever edit `content/`, `public/`, and `silica.config.ts`. The `.silica/` folder is built for you each time you run `silica dev` or `silica build`; you can delete it at any time and it will be regenerated.

## How files become URLs

Each Markdown file under `content/` becomes a page. The file path is the URL:

| File                      | URL             |
| ------------------------- | --------------- |
| `content/index.md`        | `/`             |
| `content/guides/setup.md` | `/guides/setup` |
| `content/guides/index.md` | `/guides`       |

Folder names become path segments. Add an `index.md` inside a folder only when that folder should be its own page with other pages beside it — not as an empty section wrapper.

## Static assets

- Images, PDFs, and other files used by your pages live alongside your content (for example in `content/images/`). See [[writing/embeds-and-assets|Embeds and assets]].
- Files in `public/` are served from the site root — `public/favicon.svg` becomes `/favicon.svg`. Use it for site-wide files that are not part of your vault.
