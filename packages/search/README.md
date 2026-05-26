# @silicajs/search

Server-side FlexSearch helpers for Silica.

The build step creates a serialized `Document` index and records bundle. The generated Next.js `/api/search` route lazy-loads that artifact into a process-level singleton and returns ranked results with excerpts.

Includes a benchmark helper for cold/warm search latency checks.
