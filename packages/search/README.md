# @silicajs/search

Server-side SQLite full-text search helpers for Silica.

The build step adds an FTS5 `search_index` table to `.silica/vault.db`. The generated Next.js `/api/search` route queries that shared vault database and returns ranked results with excerpts.

Includes a benchmark helper for cold/warm search latency checks.
