import { createHighlighter, type Highlighter } from "shiki";
import {
  createJavaScriptRegexEngine,
  defaultJavaScriptRegexConstructor,
} from "shiki/engine/javascript";

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
 *
 * `lazyCompileLength: Infinity` forces every grammar pattern to be compiled up
 * front instead of on first match. Shiki renders dual themes with one
 * tokenization pass per theme; with the default lazy compilation, the first
 * pass triggers compilation of large patterns and — on some serverless V8
 * builds — that first match returned wrong results, so the light pass collapsed
 * to a single scope while the (now-warm) dark pass tokenized correctly. Eager
 * compilation makes both passes deterministic.
 */
export function getSilicaHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [SILICA_SHIKI_THEMES.light, SILICA_SHIKI_THEMES.dark],
    langs: [],
    engine: createJavaScriptRegexEngine({
      forgiving: true,
      regexConstructor: (pattern) =>
        defaultJavaScriptRegexConstructor(pattern, {
          lazyCompileLength: Infinity,
        }),
    }),
  });
  return highlighterPromise;
}
