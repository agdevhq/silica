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
} from "./types.js";

export type ThemeNavigationEntry = {
  slug: string;
  title: string;
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

export type ThemeLayoutProps = {
  navigation: {
    entries: ThemeNavigationEntry[];
  };
  config: ThemeLayoutConfig;
  children: React.ReactNode;
  Provider?: ThemeProviderComponent;
};

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
  Layout: (props: ThemeLayoutProps) => React.ReactNode;
  PageRenderer: (props: ThemePageProps) => React.ReactNode;
  components?: MarkdownComponents;
};
