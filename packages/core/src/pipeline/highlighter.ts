import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

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
 * It uses the pure-JavaScript RegExp engine instead of the WASM Oniguruma
 * engine: on memory-constrained serverless runtimes (where CPU scales with
 * memory) compiling the Oniguruma WASM module on the first render dominated
 * request latency. The JS engine has no WASM startup cost, and the singleton
 * means grammars/themes are only ever loaded once per instance. Languages are
 * loaded lazily on demand by the rehype integration.
 */
export function getSilicaHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [SILICA_SHIKI_THEMES.light, SILICA_SHIKI_THEMES.dark],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighterPromise;
}
