import type { Element, Root } from "hast";
import type { ShikiTransformer } from "shiki";

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  diff: "Diff",
  docker: "Dockerfile",
  dockerfile: "Dockerfile",
  go: "Go",
  graphql: "GraphQL",
  html: "HTML",
  ini: "INI",
  java: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  jsonc: "JSON",
  jsx: "JSX",
  kotlin: "Kotlin",
  less: "Less",
  lua: "Lua",
  markdown: "Markdown",
  md: "Markdown",
  mdx: "MDX",
  objc: "Objective-C",
  php: "PHP",
  ps: "PowerShell",
  ps1: "PowerShell",
  powershell: "PowerShell",
  py: "Python",
  python: "Python",
  r: "R",
  rb: "Ruby",
  ruby: "Ruby",
  rs: "Rust",
  rust: "Rust",
  scala: "Scala",
  scss: "SCSS",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  svelte: "Svelte",
  swift: "Swift",
  toml: "TOML",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  vue: "Vue",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zig: "Zig",
  zsh: "Zsh",
};

const HIDDEN_LANGUAGES = new Set([
  "",
  "text",
  "plain",
  "plaintext",
  "txt",
  "ansi",
]);

function formatLanguage(lang: string | undefined): string | null {
  if (!lang) return null;
  const lower = lang.toLowerCase();
  if (HIDDEN_LANGUAGES.has(lower)) return null;
  return LANGUAGE_LABELS[lower] ?? lang;
}

/**
 * Wraps every Shiki-rendered `<pre>` in a semantic custom element. Shiki keeps
 * owning highlighting, while themes can map the element to their code chrome.
 */
export function rehypeShikiCodeBlockWrapper(): ShikiTransformer {
  return {
    name: "silica:code-block-wrapper",
    root(hast: Root): Root {
      const pre = hast.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "pre",
      );
      if (!pre) return hast;

      const rawLang =
        typeof this.options.lang === "string" ? this.options.lang : undefined;
      const label = formatLanguage(rawLang);

      const wrapper: Element = {
        type: "element",
        tagName: "silica-code-block",
        properties: {
          ...(rawLang ? { "data-language": rawLang } : {}),
          ...(label ? { "data-language-label": label } : {}),
        },
        children: [pre],
      };

      hast.children = [wrapper];
      return hast;
    },
  };
}
