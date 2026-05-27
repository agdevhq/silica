import type {
  AnchorHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
} from "react";
import type { SearchRecord } from "@silicajs/search";
import type { FullSlug } from "./path.js";

export type ThemeConfig =
  | "default"
  | string
  | {
      name: string;
      options?: Record<string, unknown>;
    };

export type SilicaAuthConfig = {
  provider?: "google";
  enabled?: boolean;
  allowedDomains?: string[];
  allowedEmails?: string[];
};

export type SilicaConfig = {
  title?: string;
  description?: string;
  baseUrl?: string;
  contentDir?: string;
  theme?: ThemeConfig;
  auth?: SilicaAuthConfig | false;
  wikilinks?: {
    strategy?: "absolute" | "relative" | "shortest";
    strict?: boolean;
  };
  filters?: {
    removeDrafts?: boolean;
    explicitPublish?: boolean;
  };
};

export type ResolvedSilicaConfig = {
  projectRoot: string;
  title: string;
  description: string;
  baseUrl?: string;
  contentDir: string;
  theme: ThemeConfig;
  auth?: SilicaAuthConfig;
  wikilinks: {
    strategy: "absolute" | "relative" | "shortest";
    strict: boolean;
  };
  filters: {
    removeDrafts: boolean;
    explicitPublish: boolean;
  };
};

export type TocItem = {
  id: string;
  text: string;
  depth: number;
};

export type ManifestEntry = {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  file: string;
  relativeFile: string;
  created?: string;
  modified?: string;
  frontmatter: Record<string, unknown>;
};

export type Manifest = {
  version: 1;
  generatedAt: string;
  contentDir: string;
  allSlugs: string[];
  entries: ManifestEntry[];
  bySlug: Record<string, ManifestEntry>;
};

export type Graph = {
  version: 1;
  links: Record<string, string[]>;
  backlinks: Record<string, string[]>;
  brokenLinks: BrokenLink[];
};

export type BrokenLink = {
  source: string;
  target: string;
};

export type RenderContext = {
  slug: FullSlug | string;
  allSlugs: string[];
  assetBaseUrl?: string;
  wikilinkStrategy?: "absolute" | "relative" | "shortest";
  components?: MarkdownComponents;
};

export type SilicaCalloutProps = HTMLAttributes<HTMLElement> & {
  "data-callout"?: string;
  "data-callout-title"?: string;
  "data-callout-foldable"?: string;
  "data-callout-open"?: string;
};

export type MarkdownComponents = {
  a?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  "silica-callout"?: ComponentType<SilicaCalloutProps>;
};

export type RenderResult = {
  content: ReactNode;
  frontmatter: Record<string, unknown>;
  toc: TocItem[];
  links: string[];
  brokenLinks: BrokenLink[];
  plainText: string;
  title?: string;
  description?: string;
  tags: string[];
};

export type AnalyzeResult = Omit<RenderResult, "content">;

export type PrecomputeResult = {
  manifest: Manifest;
  graph: Graph;
  searchRecords: SearchRecord[];
  buildId: string;
  brokenLinks: BrokenLink[];
};
