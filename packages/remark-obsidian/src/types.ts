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

export type ObsidianLinkTarget = {
  raw: string;
  path: string;
  heading?: string;
  blockId?: string;
  query?: string;
  params?: Record<string, string>;
};

export type ObsidianEmbedSize = {
  width: number;
  height?: number;
};

export interface ObsidianWikilink extends Parent {
  type: "obsidianWikilink";
  target: string;
  rawTarget: string;
  linkTarget: ObsidianLinkTarget;
  alias?: string;
  title: null;
  children: PhrasingContent[];
}

export interface ObsidianWikiEmbed extends Parent {
  type: "obsidianWikiEmbed";
  target: string;
  rawTarget: string;
  linkTarget: ObsidianLinkTarget;
  alias?: string;
  embedSize?: ObsidianEmbedSize;
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

export interface ObsidianComment extends Parent {
  type: "obsidianComment";
  value: string;
  children: [];
}

export interface ObsidianBlockId extends Parent {
  type: "obsidianBlockId";
  id: string;
  raw: string;
  children: [];
}

export interface ObsidianInlineFootnote extends Parent {
  type: "obsidianInlineFootnote";
  value: string;
  children: PhrasingContent[];
}

export type ObsidianPhrasingContent =
  | ObsidianWikilink
  | ObsidianWikiEmbed
  | ObsidianHighlight
  | ObsidianTag
  | ObsidianComment
  | ObsidianBlockId
  | ObsidianInlineFootnote;

export type ObsidianNode = ObsidianPhrasingContent | ObsidianCallout;

declare module "mdast" {
  interface Data {
    obsidianEmbedSize?: ObsidianEmbedSize;
  }

  interface RootContentMap {
    obsidianWikilink: ObsidianWikilink;
    obsidianWikiEmbed: ObsidianWikiEmbed;
    obsidianHighlight: ObsidianHighlight;
    obsidianCallout: ObsidianCallout;
    obsidianTag: ObsidianTag;
    obsidianComment: ObsidianComment;
    obsidianBlockId: ObsidianBlockId;
    obsidianInlineFootnote: ObsidianInlineFootnote;
  }

  interface PhrasingContentMap {
    obsidianWikilink: ObsidianWikilink;
    obsidianWikiEmbed: ObsidianWikiEmbed;
    obsidianHighlight: ObsidianHighlight;
    obsidianTag: ObsidianTag;
    obsidianComment: ObsidianComment;
    obsidianBlockId: ObsidianBlockId;
    obsidianInlineFootnote: ObsidianInlineFootnote;
  }

  interface BlockContentMap {
    obsidianCallout: ObsidianCallout;
  }
}
