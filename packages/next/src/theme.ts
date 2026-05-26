import type React from "react";
import type {
  Graph,
  Manifest,
  ManifestEntry,
  ResolvedSilicaConfig,
  TocItem,
} from "@silicajs/core/runtime";

export type ThemeLayoutProps = {
  manifest: Manifest;
  config: ResolvedSilicaConfig;
  children: React.ReactNode;
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
};
