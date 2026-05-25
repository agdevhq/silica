import path from "node:path";
import { pathToFileURL } from "node:url";
import type React from "react";
import type { Graph, Manifest, ManifestEntry, ResolvedSilicaConfig, TocItem } from "@silicajs/core";

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

export async function resolveTheme(config: ResolvedSilicaConfig): Promise<SilicaTheme> {
  const themeValue = config.theme;
  const themeName = typeof themeValue === "object" ? themeValue.name : themeValue;

  if (!themeName || themeName === "default") {
    return normalizeTheme(await import("@silicajs/theme-default"));
  }

  if (themeName.startsWith(".") || themeName.startsWith("/")) {
    const absolute = path.isAbsolute(themeName) ? themeName : path.join(config.projectRoot, themeName);
    return normalizeTheme(await import(pathToFileURL(absolute).href));
  }

  return normalizeTheme(await import(themeName));
}

function normalizeTheme(module: Record<string, unknown>): SilicaTheme {
  const candidate = (module.default ?? module) as Partial<SilicaTheme>;
  if (typeof candidate.Layout !== "function" || typeof candidate.PageRenderer !== "function") {
    throw new Error("Silica theme must export Layout and PageRenderer functions.");
  }
  return candidate as SilicaTheme;
}
