# @silicajs/search

Server-side SQLite full-text search helpers for Silica.

The build step creates a `search.db` SQLite database with an FTS5 index over vault content. The generated Next.js `/api/search` route lazy-loads that database into a process-level singleton and returns ranked results with excerpts.

Includes a benchmark helper for cold/warm search latency checks.
