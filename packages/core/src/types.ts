import type {
  AnchorHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
} from "react";
import type { SearchRecord } from "@silicajs/search";
import type { ObsidianLinkTarget } from "@silicajs/remark-obsidian";
import type { FullSlug, WikiLinkResolutionIndex } from "./path.js";

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

export type SilicaNextConfig = Record<string, unknown>;

export type SilicaNextConfigOverride =
  | SilicaNextConfig
  | ((base: SilicaNextConfig) => SilicaNextConfig);

export type SilicaConfig = {
  title?: string;
  description?: string;
  /** Public asset path (e.g. `/logo.svg`) or absolute URL shown on sign-in. */
  logo?: string;
  baseUrl?: string;
  contentDir?: string;
  theme?: ThemeConfig;
  auth?: SilicaAuthConfig | false;
  wikilinks?: {
    strategy?: "absolute" | "relative" | "shortest";
    strict?: boolean;
  };
  tags?: {
    inline?: boolean;
  };
  ordering?: {
    numericPrefixes?: boolean;
  };
  filters?: {
    removeDrafts?: boolean;
    explicitPublish?: boolean;
  };
  render?: SilicaRenderConfig;
  nextConfig?: SilicaNextConfigOverride;
};

export type SilicaRenderConfig = {
  prerender?: SilicaPrerenderConfig;
  cache?: {
    storage?: "memory" | "filesystem";
    directory?: string;
  };
};

export type SilicaPrerenderSelectionOptions = {
  include?: string[];
  exclude?: string[];
  limit?: number;
};

export type PrerenderSelectorContext = {
  manifest: Manifest;
  graph: Graph;
};

export type SilicaPrerenderConfig =
  | "all"
  | "none"
  | ({ strategy: "all" } & SilicaPrerenderSelectionOptions)
  | ({ strategy: "none" } & SilicaPrerenderSelectionOptions)
  | ({ strategy?: "depth"; depth: number } & SilicaPrerenderSelectionOptions)
  | ({
      strategy: "custom";
      select?: (
        entry: ManifestEntry,
        context: PrerenderSelectorContext,
      ) => boolean | number;
    } & SilicaPrerenderSelectionOptions);

export type ResolvedSilicaConfig = {
  projectRoot: string;
  title: string;
  description: string;
  logo?: string;
  baseUrl?: string;
  contentDir: string;
  theme: ThemeConfig;
  auth?: SilicaAuthConfig;
  wikilinks: {
    strategy: "absolute" | "relative" | "shortest";
    strict: boolean;
  };
  tags: {
    inline: boolean;
  };
  ordering: {
    numericPrefixes: boolean;
  };
  filters: {
    removeDrafts: boolean;
    explicitPublish: boolean;
  };
  render: ResolvedSilicaRenderConfig;
};

export type ResolvedSilicaRenderConfig = {
  prerender: ResolvedSilicaPrerenderConfig;
  cache: {
    storage: "memory" | "filesystem";
    directory?: string;
  };
};

export type ResolvedSilicaPrerenderConfig =
  | ({ strategy: "all" } & SilicaPrerenderSelectionOptions)
  | ({ strategy: "none" } & SilicaPrerenderSelectionOptions)
  | ({ strategy: "depth"; depth: number } & SilicaPrerenderSelectionOptions)
  | ({
      strategy: "custom";
      select?: (
        entry: ManifestEntry,
        context: PrerenderSelectorContext,
      ) => boolean | number;
    } & SilicaPrerenderSelectionOptions);

export type TocItem = {
  id: string;
  text: string;
  depth: number;
};

export type ManifestEntry = {
  slug: string;
  title: string;
  menuLabel: string;
  description?: string;
  generatedDescription?: string;
  tags: string[];
  file: string;
  relativeFile: string;
  sortKey?: string;
  created?: string;
  modified?: string;
  frontmatter: Record<string, unknown>;
  contentHash: string;
  embeds: string[];
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

export type NavigationEntry = {
  slug: string;
  title: string;
  sortKey?: string;
};

export type Navigation = {
  version: 1;
  entries: NavigationEntry[];
};

export type BrokenLink = {
  source: string;
  target: string;
};

export type RenderContext = {
  slug: FullSlug | string;
  wikilinkIndex: WikiLinkResolutionIndex;
  assetBaseUrl?: string;
  resolveEmbed?: (
    target: ObsidianLinkTarget,
  ) => Promise<string | undefined> | string | undefined;
  embedDepth?: number;
  maxEmbedDepth?: number;
  wikilinkStrategy?: "absolute" | "relative" | "shortest";
  tags?: {
    inline?: boolean;
  };
  ordering?: {
    numericPrefixes?: boolean;
  };
  components?: MarkdownComponents;
};

export type SilicaCalloutProps = HTMLAttributes<HTMLElement> & {
  "data-callout"?: string;
  "data-callout-title"?: string;
  "data-callout-foldable"?: string;
  "data-callout-open"?: string;
};

export type SilicaCodeBlockProps = HTMLAttributes<HTMLElement> & {
  "data-language"?: string;
  "data-language-label"?: string;
};

export type SilicaEmbedProps = HTMLAttributes<HTMLElement> & {
  "data-embed-kind"?: string;
  "data-embed-target"?: string;
  src?: string;
};

export type SilicaMermaidProps = HTMLAttributes<HTMLElement> & {
  "data-source"?: string;
};

export type MarkdownComponents = {
  a?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  "silica-callout"?: ComponentType<SilicaCalloutProps>;
  "silica-code-block"?: ComponentType<SilicaCodeBlockProps>;
  "silica-embed"?: ComponentType<SilicaEmbedProps>;
  "silica-mermaid"?: ComponentType<SilicaMermaidProps>;
};

export type RenderResult = {
  content: ReactNode;
  toc: TocItem[];
};

export type AnalyzeResult = {
  frontmatter: Record<string, unknown>;
  links: string[];
  embeds: string[];
  brokenLinks: BrokenLink[];
  plainText: string;
  title?: string;
  description?: string;
  generatedDescription?: string;
  tags: string[];
};

export type PrerenderManifest = {
  version: 1;
  slugs: string[];
};

export type RenderCacheState = {
  version: 1;
  renderEnvironmentHash: string;
  configHash: string;
  siteMetadataHash: string;
  themeHash?: string;
  rendererVersion: string;
  generatedAt: string;
};

export type RouteCacheKeyManifest = {
  version: 1;
  renderEnvironmentHash: string;
  entries: Record<string, { renderHash: string }>;
};

export type PrecomputeResult = {
  manifest: Manifest;
  routeCacheKeys: RouteCacheKeyManifest;
  graph: Graph;
  searchRecords: SearchRecord[];
  prerender: PrerenderManifest;
  cacheState: RenderCacheState;
  brokenLinks: BrokenLink[];
};
