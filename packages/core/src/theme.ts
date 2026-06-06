import type React from "react";
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
};

export type ThemePage = {
  slug: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  frontmatter: Record<string, unknown>;
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
