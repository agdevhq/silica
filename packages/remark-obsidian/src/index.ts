import type { Processor } from "unified";
import type {} from "remark-parse";
import type {} from "remark-stringify";
import { obsidian } from "./micromark.js";
import { obsidianFromMarkdown, obsidianToMarkdown } from "./mdast.js";
import type { RemarkObsidianOptions } from "./types.js";

export type {
  InlineTagMatch,
  ObsidianCallout,
  ObsidianHighlight,
  ObsidianNode,
  ObsidianPhrasingContent,
  ObsidianTag,
  ObsidianWikiEmbed,
  ObsidianWikilink,
  RemarkObsidianOptions,
} from "./types.js";
export {
  collectInlineTagMatches,
  extractInlineTags,
  getFrontmatterTags,
  getTagHierarchy,
  getTags,
  normalizeTag,
  tagMatches,
} from "./tags.js";

export function remarkObsidian(
  this: Processor,
  options: RemarkObsidianOptions = {},
) {
  const data = this.data();
  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  micromarkExtensions.push(obsidian(options));
  fromMarkdownExtensions.push(obsidianFromMarkdown());
  toMarkdownExtensions.push(obsidianToMarkdown());
}
