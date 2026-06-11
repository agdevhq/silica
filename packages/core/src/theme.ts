import type React from "react";
import type { PageProperty } from "./pipeline/frontmatter.js";
import type {
  ManifestEntry,
  MarkdownComponents,
  ResolvedSilicaConfig,
  TocItem,
} from "./types.js";

export type {
  MarkdownComponents,
  SilicaCalloutProps,
  SilicaCodeBlockProps,
  SilicaEmbedProps,
  SilicaMermaidProps,
} from "./types.js";

export type ThemeBreadcrumb = {
  label: string;
  href?: string;
};

export type ThemeBacklink = {
  slug: string;
  title: string;
};

export type ThemeLayoutConfig = {
  title: string;
  description: string;
  logo?: string;
  baseUrl?: string;
  authEnabled: boolean;
  assistantEnabled: boolean;
};

/**
 * Pre-wired AI assistant components handed to themes when the maintainer
 * enabled AI and `@silicajs/assistant` is installed. Themes that support
 * the assistant decide where to render them; themes that don't simply
 * ignore the prop.
 */
export type ThemeAssistantSlots = {
  /** Client-side conversation state; must wrap Trigger and Panel. */
  Provider: (props: { children: React.ReactNode }) => React.ReactNode;
  /** Button that opens the assistant (also binds the keyboard shortcut). */
  Trigger: (props: { className?: string; label?: string }) => React.ReactNode;
  /**
   * The assistant chat window (conversation + composer). Fills its
   * container; the theme owns placement and sizing — e.g. a docked,
   * resizable sidebar — and decides when to show it based on the `open`
   * flag of the assistant context in `@silicajs/components`.
   */
  Panel: (props: { className?: string }) => React.ReactNode;
};

export type ThemeProviderComponent = (props: {
  children: React.ReactNode;
}) => React.ReactNode;

export type ThemeRootLayoutProps = {
  config: ThemeLayoutConfig;
  children: React.ReactNode;
  Provider?: ThemeProviderComponent;
};

export type ThemeSiteLayoutProps = {
  navigationEndpoint: string;
  config: ThemeLayoutConfig;
  children: React.ReactNode;
  /** Present only when AI is enabled for the site. */
  assistant?: ThemeAssistantSlots;
};

export type ThemePage = {
  slug: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  frontmatter: Record<string, unknown>;
  pageProperties?: PageProperty[];
  toc: TocItem[];
  tags: string[];
  entry: ManifestEntry;
};

export type ThemePageProps = {
  page: ThemePage;
  breadcrumbs: ThemeBreadcrumb[];
  backlinks: ThemeBacklink[];
  config: ResolvedSilicaConfig;
};

export type SilicaTheme = {
  RootLayout: (props: ThemeRootLayoutProps) => React.ReactNode;
  SiteLayout: (props: ThemeSiteLayoutProps) => React.ReactNode;
  PageRenderer: (props: ThemePageProps) => React.ReactNode;
  components?: MarkdownComponents;
};
