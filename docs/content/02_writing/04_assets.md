---
title: Assets
description: Images, embeds, and static files in your vault.
---

## Vault assets

Store files alongside your markdown or in dedicated folders:

```txt
content/
├── index.md
└── images/
    └── sample.svg
```

Reference them with wikilink embeds or standard markdown:

```markdown
![[images/sample.svg]]
![[images/sample.svg|320]]
![Sample](/silica/images/sample.svg)
```

During precompute, vault assets are copied to `.silica/next/public/silica/` and served at `/silica/*`.

Example embed:

![[images/sample.svg]]

Example embed with Obsidian dimensions:

![[images/sample.svg|180]]

## Relative markdown links

Standard markdown image syntax with relative paths is rewritten automatically:

```markdown
![](images/photo.png)
![Photo|640x480](images/photo.png)
```

Obsidian image dimensions use `|width` or `|widthxheight` in either wikilink embeds or markdown image alt text.

## Media embeds

Silica renders common vault assets by media type:

```markdown
![[audio/interview.mp3]]
![[video/demo.mp4]]
![[documents/spec.pdf#height=400]]
![[boards/roadmap.canvas]]
```

Images render as `<img>`, audio and video render with controls, and PDFs or unknown files render through the theme's `silica-embed` component.

## Note embeds

Embed another page by using a wikilink embed without an asset extension:

```markdown
![[writing/wikilinks]]
![[writing/wikilinks#Heading]]
![[writing/wikilinks#^block-id]]
```

When the runtime can resolve the target page, Silica renders the embedded page content inline. Otherwise, it falls back to link-style behavior.

Live note embed:

![[writing/embed-example#Embed section]]

Live block embed:

![[writing/embed-example#^embed-example-block]]

## Public directory

Files in `public/` at the project root are served from the site root:

```txt
public/
└── favicon.svg   → /favicon.svg
```

Use `public/` for site-wide static files that are not part of the vault content tree.

## Auth and assets

When authentication is enabled, the generated `proxy.ts` protects `/silica/*` routes along with page content and search. Private vault assets stay behind the same access gate.
