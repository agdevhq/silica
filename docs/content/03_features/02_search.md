---
title: Search
description: Fast full-text search with a command palette.
---

Every Silica site comes with built-in full-text search. Readers can find any page by title, content, or tag.

## Using search

Open search from the button in the sidebar, or press **⌘K** (Ctrl+K on Windows and Linux). Start typing and pick a result to jump to that page.

Search by tag with `#tag` or `tag:#tag`. Parent tags include their nested tags, so `#project` also finds `#project/active`.

## What gets indexed

Each page contributes its title, its text content, and its tags. Drafts and unlisted pages are left out (see [[publishing/drafts-and-publishing|Drafts and publishing]]).

## Private by default

Search runs on the server, so the full index never ships to the browser. If you enable [[publishing/authentication|authentication]], search stays behind the same sign-in as your pages — readers only search what they are allowed to see.
