export { defineConfig, loadConfig, resolveConfig } from "./config.js";
export { resolvePublicAssetPath } from "./logo.js";
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
  createWikiLinkResolutionIndex,
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
  type WikiLinkResolutionIndex,
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
  generateDescriptionFromContent,
  getDescription,
  getMetaDescription,
  getTitle,
  renderMarkdown,
  renderMarkdownHtml,
} from "./pipeline/index.js";
export {
  getGitDates,
  precompute,
  type PrecomputeOptions,
} from "./precompute.js";
export { tagToHref } from "./tags.js";
export type {
  MarkdownComponents,
  SilicaTheme,
  SilicaCalloutProps,
  SilicaCodeBlockProps,
  SilicaEmbedProps,
  SilicaMermaidProps,
  ThemeBacklink,
  ThemeBreadcrumb,
  ThemeLayoutConfig,
  ThemePage,
  ThemePageProps,
  ThemeProviderComponent,
  ThemeRootLayoutProps,
  ThemeSiteLayoutProps,
} from "./theme.js";
export type {
  AnalyzeResult,
  BrokenLink,
  Graph,
  Manifest,
  ManifestEntry,
  Navigation,
  NavigationEntry,
  PrecomputeResult,
  RenderContext,
  RenderResult,
  ResolvedSilicaConfig,
  SilicaAuthConfig,
  SilicaConfig,
  ThemeConfig,
  TocItem,
} from "./types.js";
