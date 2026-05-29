import type { PhrasingContent } from "mdast";
import type {
  CompileContext,
  Extension as FromMarkdownExtension,
  Handle as FromMarkdownHandle,
} from "mdast-util-from-markdown";
import type {
  Handle as ToMarkdownHandle,
  Options as ToMarkdownExtension,
} from "mdast-util-to-markdown";
import type { Token } from "micromark-util-types";
import type {
  ObsidianCallout,
  ObsidianHighlight,
  ObsidianTag,
  ObsidianWikiEmbed,
  ObsidianWikilink,
} from "./types.js";
import { normalizeTag } from "./tags.js";

export function obsidianFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      obsidianWikilink: enterWikilink,
      obsidianWikiEmbed: enterWikiEmbed,
      obsidianHighlight: enterHighlight,
      obsidianCallout: enterCallout,
      obsidianTag: enterTag,
    },
    exit: {
      obsidianWikilink: exitWiki,
      obsidianWikiEmbed: exitWiki,
      obsidianHighlight: exitHighlight,
      obsidianCallout: exitCallout,
      obsidianCalloutMarker: exitCalloutMarker,
      obsidianTag: exitTag,
    },
  };
}

export function obsidianToMarkdown(): ToMarkdownExtension {
  return {
    handlers: {
      obsidianWikilink: handleWikilink,
      obsidianWikiEmbed: handleWikiEmbed,
      obsidianHighlight: handleHighlight,
      obsidianCallout: handleCallout,
      obsidianTag: handleTag,
    },
  };
}

const enterWikilink: FromMarkdownHandle = function enterWikilink(token) {
  this.enter(
    {
      type: "obsidianWikilink",
      target: "",
      title: null,
      children: [],
    } as ObsidianWikilink,
    token,
  );
};

const enterWikiEmbed: FromMarkdownHandle = function enterWikiEmbed(token) {
  this.enter(
    {
      type: "obsidianWikiEmbed",
      target: "",
      title: null,
      children: [],
    } as ObsidianWikiEmbed,
    token,
  );
};

const enterHighlight: FromMarkdownHandle = function enterHighlight(token) {
  this.enter(
    {
      type: "obsidianHighlight",
      children: [],
    } as ObsidianHighlight,
    token,
  );
};

const enterTag: FromMarkdownHandle = function enterTag(token) {
  this.enter(
    {
      type: "obsidianTag",
      tag: "",
      raw: "",
      children: [],
    } as ObsidianTag,
    token,
  );
};

const enterCallout: FromMarkdownHandle = function enterCallout(token) {
  this.enter(
    {
      type: "obsidianCallout",
      kind: "note",
      title: "Note",
      children: [],
    } as ObsidianCallout,
    token,
  );
};

function exitWiki(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as
    | ObsidianWikilink
    | ObsidianWikiEmbed;
  const markerLength = node.type === "obsidianWikiEmbed" ? 3 : 2;
  const [target, alias] = splitWikiTarget(raw.slice(markerLength, -2));
  node.target = target;
  node.alias = alias;
  node.children = [{ type: "text", value: alias || target }];
  this.exit(token);
}

function exitHighlight(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as ObsidianHighlight;
  node.children = [{ type: "text", value: raw.slice(2, -2) }];
  this.exit(token);
}

function exitCallout(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as ObsidianCallout;
  node.title = node.title || titleCase(node.kind);
  this.exit(token);
}

function exitCalloutMarker(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as ObsidianCallout;
  const marker = this.sliceSerialize(token);
  const match = marker.match(/^\[!([\w-]+)]([+-]?)\s*(.*?)\s*$/);
  if (!match) return;
  node.kind = match[1]!.toLowerCase();
  node.fold =
    match[2] === "+" ? "open" : match[2] === "-" ? "closed" : undefined;
  node.title = match[3]?.trim() || titleCase(node.kind);
}

function exitTag(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as ObsidianTag;
  node.raw = raw;
  node.tag = normalizeTag(raw);
  node.children = [{ type: "text", value: raw }];
  this.exit(token);
}

const handleWikilink: ToMarkdownHandle = function handleWikilink(node) {
  const wikilink = node as ObsidianWikilink;
  return `[[${formatWikiTarget(wikilink.target, wikilink.alias)}]]`;
};

const handleWikiEmbed: ToMarkdownHandle = function handleWikiEmbed(node) {
  const embed = node as ObsidianWikiEmbed;
  return `![[${formatWikiTarget(embed.target, embed.alias)}]]`;
};

const handleHighlight: ToMarkdownHandle = function handleHighlight(
  node,
  _parent,
  state,
  info,
) {
  const highlight = node as ObsidianHighlight;
  return `==${state.containerPhrasing(highlight, info)}==`;
};

const handleTag: ToMarkdownHandle = function handleTag(node) {
  const tag = node as ObsidianTag;
  return tag.raw || `#${tag.tag}`;
};

const handleCallout: ToMarkdownHandle = function handleCallout(
  node,
  _parent,
  state,
  info,
) {
  const callout = node as ObsidianCallout;
  const fold =
    callout.fold === "open" ? "+" : callout.fold === "closed" ? "-" : "";
  const marker = `[!${callout.kind}]${fold} ${callout.title}`.trimEnd();
  const body = state.containerFlow(callout, info);
  return [`> ${marker}`, ...quoteFlow(body)].join("\n");
};

function splitWikiTarget(inner: string): [string, string?] {
  const [target, alias] = inner.split("|");
  return [(target ?? "").trim(), alias?.trim()];
}

function formatWikiTarget(target: string, alias: string | undefined): string {
  return alias ? `${target}|${alias}` : target;
}

function quoteFlow(value: string): string[] {
  if (!value) return [];
  return value.split("\n").map((line) => (line ? `> ${line}` : ">"));
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}
