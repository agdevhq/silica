---
title: Embeds and assets
description: Images, media, and embedded notes in your vault.
---

Store images and other files alongside your Markdown, then embed them with Obsidian's `![[...]]` syntax.

```txt
content/
├── index.md
└── images/
    └── sample.svg
```

## Embedding images

```markdown
![[images/sample.svg]]
![[images/sample.svg|320]]
![Sample](images/sample.svg)
```

You can set an image's size with Obsidian dimensions — `|width` or `|widthxheight`:

Default size:

![[images/sample.svg]]

Constrained width:

![[images/sample.svg|180]]

Standard Markdown image links work too, and relative paths are resolved for you:

```markdown
![](images/photo.png)
![Photo|640x480](images/photo.png)
```

## Embedding other media

Silica renders common file types with the right element — images show inline, audio and video get players, and PDFs and other files render in an embed:

```markdown
![[audio/interview.mp3]]
![[video/demo.mp4]]
![[documents/spec.pdf]]
```

Supported file types include `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `pdf`, `mp4`, `mov`, `mp3`, `wav`, `ogg`, and `canvas`.

## Embedding another note

Embed a whole page, a section, or a single block by leaving off the file extension:

```markdown
![[writing/links]]
![[writing/links#Heading]]
![[writing/links#^block-id]]
```

Live section embed:

![[writing/embed-example#Embed section]]

Live block embed:

![[writing/embed-example#^embed-example-block]]

## Site-wide files

Files in the `public/` folder are served from the site root — `public/favicon.svg` becomes `/favicon.svg`. Use it for things like a favicon or a logo that are not part of your vault content.
