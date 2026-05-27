export { defineConfig, loadConfig, resolveConfig } from "./config.js";
export {
  isMarkdownFile,
  scanContent,
  type ContentAssetFile,
  type ContentMarkdownFile,
  type ContentScan,
} from "./files.js";
export {
  asFilePath,
  asFullSlug,
  asRelativeURL,
  asSimpleSlug,
  hrefToSlug,
  joinSegments,
  normalizePath,
  normalizeSlug,
  pathToRoot,
  resolveRelative,
  resolveWikiLink,
  simplifySlug,
  slugifyFilePath,
  slugifySegment,
  slugToHref,
  type FilePath,
  type FullSlug,
  type RelativeURL,
  type SimpleSlug,
} from "./path.js";
export {
  formatPropertyLabel,
  formatPropertyValue,
  getMenuLabel,
  getPageProperties,
  type PageProperty,
} from "./pipeline/frontmatter.js";
export {
  analyzeMarkdown,
  getDescription,
  getTags,
  getTitle,
  renderMarkdown,
} from "./pipeline/index.js";
export {
  extractInlineTags,
  getTagHierarchy,
  normalizeTag,
  tagMatches,
  tagToHref,
} from "./pipeline/tags.js";
export {
  getGitDates,
  precompute,
  type PrecomputeOptions,
} from "./precompute.js";
export type {
  MarkdownComponents,
  SilicaTheme,
  SilicaCalloutProps,
  SilicaCodeBlockProps,
  ThemeLayoutConfig,
  ThemeLayoutProps,
  ThemeNavigationEntry,
  ThemePage,
  ThemePageProps,
  ThemeProviderComponent,
} from "./theme.js";
export type {
  AnalyzeResult,
  BrokenLink,
  Graph,
  Manifest,
  ManifestEntry,
  PrecomputeResult,
  RenderContext,
  RenderResult,
  ResolvedSilicaConfig,
  SilicaAuthConfig,
  SilicaConfig,
  ThemeConfig,
  TocItem,
} from "./types.js";
