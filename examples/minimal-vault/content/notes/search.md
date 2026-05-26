---
title: Search notes
description: Server-side search keeps the index private.
tags: [search]
date: 2026-05-23
created: 2026-05-23
modified: 2026-05-24
engine: flexsearch
latency_target_ms: 100
indexed_fields: [title, content, tags]
---

FlexSearch is built during precompute and lazy-loaded by the `/api/search` route.

The command palette calls the server instead of shipping a full private index to browsers.
