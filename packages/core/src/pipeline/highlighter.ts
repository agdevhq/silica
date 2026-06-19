import { createHighlighter, type Highlighter } from "shiki";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

/**
 * Themes used for every code block. Kept here so the highlighter and the
 * rehype integration agree on what to preload.
 */
export const SILICA_SHIKI_THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const;

let highlighterPromise: Promise<Highlighter> | undefined;

/**
 * Returns a process-wide Shiki highlighter.
 *
 * It uses the WASM Oniguruma engine so Shiki tokenizes dual-theme code blocks
 * deterministically across cold starts and deployment runtimes.
 *
 * The singleton means the WASM module and grammars/themes are only ever
 * compiled once per instance; languages are still loaded lazily on demand by
 * the rehype integration, so a cold instance only pays for the grammars a page
 * actually uses, and full pages are durably cached on top of that.
 */
export function getSilicaHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [SILICA_SHIKI_THEMES.light, SILICA_SHIKI_THEMES.dark],
    langs: [],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
  return highlighterPromise;
}
