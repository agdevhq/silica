# @silicajs/remark-obsidian

Remark plugin for parsing Obsidian-flavored Markdown syntax into mdast nodes.

This package only parses and serializes syntax. It does not resolve wikilinks, render embeds, rewrite assets, or apply application-specific routing.

## Install

```sh
npm install @silicajs/remark-obsidian
```

## Usage

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { remarkObsidian } from "@silicajs/remark-obsidian";

const file = await unified()
  .use(remarkParse)
  .use(remarkObsidian)
  .use(remarkStringify)
  .process("See [[Notes|my notes]] and ==highlighted **text**==.");

console.log(String(file));
```

## Supported Syntax

- Wikilinks: `[[Page]]`, `[[Page|Alias]]`, `[[Page#Heading]]`, `[[Page#^block-id]]`
- Wiki embeds: `![[image.png]]`, `![[image.png|320x180]]`, `![[Page]]`
- Callouts: `> [!note] Title`
- Highlights: `==highlighted **text**==`
- Comments: `%% hidden %%`
- Block IDs: `^block-id`
- Inline footnotes: `^[Inline **footnote**]`
- Inline tags: `#project/active`
- Image dimensions in Markdown image alt text: `![Alt|320x180](image.png)`

## Options

```ts
type RemarkObsidianOptions = {
  inlineTags?: boolean;
};
```

Set `inlineTags: false` to leave `#tag` text untouched while still exposing tag helper functions.

## Exports

The package exports:

- `remarkObsidian`
- tag helpers: `getTags`, `getFrontmatterTags`, `extractInlineTags`, `collectInlineTagMatches`, `normalizeTag`, `tagMatches`, `getTagHierarchy`
- mdast node types for Obsidian syntax

## Node Types

The plugin adds mdast node types such as `obsidianWikilink`, `obsidianWikiEmbed`, `obsidianCallout`, `obsidianHighlight`, `obsidianComment`, `obsidianBlockId`, `obsidianInlineFootnote`, and `obsidianTag`.

Consumers should provide their own rendering or transformation layer for these nodes.
