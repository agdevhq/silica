import type { Parent, PhrasingContent, BlockContent } from "mdast";

export type RemarkObsidianOptions = {
  inlineTags?: boolean;
};

export type InlineTagMatch = {
  tag: string;
  raw: string;
  start: number;
  end: number;
};

export interface ObsidianWikilink extends Parent {
  type: "obsidianWikilink";
  target: string;
  alias?: string;
  title: null;
  children: PhrasingContent[];
}

export interface ObsidianWikiEmbed extends Parent {
  type: "obsidianWikiEmbed";
  target: string;
  alias?: string;
  title: null;
  children: PhrasingContent[];
}

export interface ObsidianHighlight extends Parent {
  type: "obsidianHighlight";
  children: PhrasingContent[];
}

export interface ObsidianCallout extends Parent {
  type: "obsidianCallout";
  kind: string;
  title: string;
  fold?: "open" | "closed";
  children: BlockContent[];
}

export interface ObsidianTag extends Parent {
  type: "obsidianTag";
  tag: string;
  raw: string;
  children: PhrasingContent[];
}

export type ObsidianPhrasingContent =
  | ObsidianWikilink
  | ObsidianWikiEmbed
  | ObsidianHighlight
  | ObsidianTag;

export type ObsidianNode = ObsidianPhrasingContent | ObsidianCallout;

declare module "mdast" {
  interface RootContentMap {
    obsidianWikilink: ObsidianWikilink;
    obsidianWikiEmbed: ObsidianWikiEmbed;
    obsidianHighlight: ObsidianHighlight;
    obsidianCallout: ObsidianCallout;
    obsidianTag: ObsidianTag;
  }

  interface PhrasingContentMap {
    obsidianWikilink: ObsidianWikilink;
    obsidianWikiEmbed: ObsidianWikiEmbed;
    obsidianHighlight: ObsidianHighlight;
    obsidianTag: ObsidianTag;
  }

  interface BlockContentMap {
    obsidianCallout: ObsidianCallout;
  }
}
