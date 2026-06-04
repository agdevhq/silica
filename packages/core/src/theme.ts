import type React from "react";
import type {
  Graph,
  Manifest,
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

export type ThemeNavigationEntry = {
  slug: string;
  title: string;
  sortKey?: string;
};

export type ThemeLayoutConfig = {
  title: string;
  description: string;
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
  navigation: {
    entries: ThemeNavigationEntry[];
  };
  config: ThemeLayoutConfig;
  children: React.ReactNode;
};

export type ThemeLayoutProps = ThemeRootLayoutProps & ThemeSiteLayoutProps;

export type ThemePage = {
  slug: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  frontmatter: Record<string, unknown>;
  toc: TocItem[];
  entry: ManifestEntry;
};

export type ThemePageProps = {
  page: ThemePage;
  graph: Graph;
  manifest: Manifest;
  config: ResolvedSilicaConfig;
};

export type SilicaTheme = {
  RootLayout: (props: ThemeRootLayoutProps) => React.ReactNode;
  SiteLayout: (props: ThemeSiteLayoutProps) => React.ReactNode;
  /** Full chrome (root + site). Custom themes may omit Root/Site and only provide Layout. */
  Layout?: (props: ThemeLayoutProps) => React.ReactNode;
  PageRenderer: (props: ThemePageProps) => React.ReactNode;
  components?: MarkdownComponents;
};
