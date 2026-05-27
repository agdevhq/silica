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
![Sample](/silica/images/sample.svg)
```

During precompute, vault assets are copied to `.silica/next/public/silica/` and served at `/silica/*`.

Example embed:

![[images/sample.svg]]

## Relative markdown links

Standard markdown image syntax with relative paths is rewritten automatically:

```markdown
![](images/photo.png)
```

## Public directory

Files in `public/` at the project root are served from the site root:

```txt
public/
└── favicon.svg   → /favicon.svg
```

Use `public/` for site-wide static files that are not part of the vault content tree.

## Auth and assets

When authentication is enabled, the generated `proxy.ts` protects `/silica/*` routes along with page content and search. Private vault assets stay behind the same access gate.

