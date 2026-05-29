import type { Image, PhrasingContent, Root } from "mdast";
import type {
  CompileContext,
  Extension as FromMarkdownExtension,
  Handle as FromMarkdownHandle,
  Transform as FromMarkdownTransform,
} from "mdast-util-from-markdown";
import type {
  Handle as ToMarkdownHandle,
  Options as ToMarkdownExtension,
} from "mdast-util-to-markdown";
import type { Token } from "micromark-util-types";
import type {
  ObsidianBlockId,
  ObsidianCallout,
  ObsidianComment,
  ObsidianEmbedSize,
  ObsidianHighlight,
  ObsidianInlineFootnote,
  ObsidianLinkTarget,
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
      obsidianBlockId: enterBlockId,
      obsidianComment: enterComment,
      obsidianInlineFootnote: enterInlineFootnote,
      obsidianTag: enterTag,
    },
    exit: {
      obsidianWikilink: exitWiki,
      obsidianWikiEmbed: exitWiki,
      obsidianHighlight: exitHighlight,
      obsidianCallout: exitCallout,
      obsidianCalloutMarker: exitCalloutMarker,
      obsidianBlockId: exitBlockId,
      obsidianComment: exitComment,
      obsidianInlineFootnote: exitInlineFootnote,
      obsidianTag: exitTag,
    },
    transforms: [transformImageDimensions],
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
      obsidianComment: handleComment,
      obsidianBlockId: handleBlockId,
      obsidianInlineFootnote: handleInlineFootnote,
    },
  };
}

const enterWikilink: FromMarkdownHandle = function enterWikilink(token) {
  this.enter(
    {
      type: "obsidianWikilink",
      target: "",
      rawTarget: "",
      linkTarget: parseLinkTarget(""),
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
      rawTarget: "",
      linkTarget: parseLinkTarget(""),
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

const enterComment: FromMarkdownHandle = function enterComment(token) {
  this.enter(
    {
      type: "obsidianComment",
      value: "",
      children: [],
    } as ObsidianComment,
    token,
  );
};

const enterBlockId: FromMarkdownHandle = function enterBlockId(token) {
  this.enter(
    {
      type: "obsidianBlockId",
      id: "",
      raw: "",
      children: [],
    } as ObsidianBlockId,
    token,
  );
};

const enterInlineFootnote: FromMarkdownHandle = function enterInlineFootnote(
  token,
) {
  this.enter(
    {
      type: "obsidianInlineFootnote",
      value: "",
      children: [],
    } as ObsidianInlineFootnote,
    token,
  );
};

function exitWiki(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as
    | ObsidianWikilink
    | ObsidianWikiEmbed;
  const markerLength = node.type === "obsidianWikiEmbed" ? 3 : 2;
  const parsed = parseWikiInner(raw.slice(markerLength, -2), {
    embed: node.type === "obsidianWikiEmbed",
  });
  node.target = parsed.rawTarget;
  node.rawTarget = parsed.rawTarget;
  node.linkTarget = parsed.linkTarget;
  node.alias = parsed.alias;
  if (node.type === "obsidianWikiEmbed") {
    node.embedSize = parsed.embedSize;
  }
  node.children = [
    { type: "text", value: parsed.alias || parsed.rawTarget || parsed.label },
  ];
  this.exit(token);
}

function exitHighlight(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as ObsidianHighlight;
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

function exitComment(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as ObsidianComment;
  node.value = raw.slice(2, -2);
  this.exit(token);
}

function exitBlockId(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as ObsidianBlockId;
  node.raw = raw;
  node.id = raw.replace(/^\^/, "");
  this.exit(token);
}

function exitInlineFootnote(this: CompileContext, token: Token) {
  const raw = this.sliceSerialize(token);
  const node = this.stack[this.stack.length - 1] as ObsidianInlineFootnote;
  node.value = raw.slice(2, -1);
  this.exit(token);
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
  return `[[${formatWikiTarget(wikilink.rawTarget, wikilink.alias)}]]`;
};

const handleWikiEmbed: ToMarkdownHandle = function handleWikiEmbed(node) {
  const embed = node as ObsidianWikiEmbed;
  const alias = embed.embedSize
    ? formatEmbedSize(embed.embedSize)
    : embed.alias;
  return `![[${formatWikiTarget(embed.rawTarget, alias)}]]`;
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

const handleComment: ToMarkdownHandle = function handleComment(node) {
  const comment = node as ObsidianComment;
  return `%%${comment.value}%%`;
};

const handleBlockId: ToMarkdownHandle = function handleBlockId(node) {
  const blockId = node as ObsidianBlockId;
  return blockId.raw || `^${blockId.id}`;
};

const handleInlineFootnote: ToMarkdownHandle = function handleInlineFootnote(
  node,
  _parent,
  state,
  info,
) {
  const footnote = node as ObsidianInlineFootnote;
  return `^[${state.containerPhrasing(footnote, info)}]`;
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

function formatWikiTarget(target: string, alias: string | undefined): string {
  return alias ? `${target}|${alias}` : target;
}

const transformImageDimensions: FromMarkdownTransform =
  function transformImages(tree) {
    visitImages(tree, (node) => {
      const parsed = parseAliasOrSize(node.alt ?? "");
      if (!parsed.embedSize) return;
      node.alt = parsed.alias ?? "";
      node.data = {
        ...node.data,
        obsidianEmbedSize: parsed.embedSize,
      };
    });
  };

function parseWikiInner(
  inner: string,
  options: { embed: boolean },
): {
  rawTarget: string;
  linkTarget: ObsidianLinkTarget;
  alias?: string;
  embedSize?: ObsidianEmbedSize;
  label: string;
} {
  const [rawTargetPart, aliasPart] = splitWikiPipe(inner);
  const rawTarget = rawTargetPart.trim();
  const parsedAlias = parseAliasOrSize(aliasPart?.trim() ?? "");
  const alias = options.embed ? parsedAlias.alias : aliasPart?.trim();
  return {
    rawTarget,
    linkTarget: parseLinkTarget(rawTarget),
    alias: alias || undefined,
    embedSize: options.embed ? parsedAlias.embedSize : undefined,
    label: rawTarget.split("/").at(-1) || rawTarget,
  };
}

function parseLinkTarget(raw: string): ObsidianLinkTarget {
  const [pathAndFragment = "", query = ""] = raw.split("?");
  const hashIndex = pathAndFragment.indexOf("#");
  const path =
    hashIndex === -1 ? pathAndFragment : pathAndFragment.slice(0, hashIndex);
  const fragment =
    hashIndex === -1 ? "" : pathAndFragment.slice(hashIndex + 1).trim();
  const target: ObsidianLinkTarget = {
    raw,
    path: path.trim(),
  };

  if (fragment.startsWith("^")) {
    target.blockId = fragment.slice(1);
  } else if (fragment.includes("=")) {
    target.params = Object.fromEntries(new URLSearchParams(fragment));
  } else if (fragment) {
    target.heading = fragment;
  }

  if (query) {
    target.query = query;
    target.params = {
      ...target.params,
      ...Object.fromEntries(new URLSearchParams(query)),
    };
  }

  return target;
}

function parseAliasOrSize(value: string): {
  alias?: string;
  embedSize?: ObsidianEmbedSize;
} {
  if (!value) return {};
  const size = parseEmbedSize(value);
  if (size) return { embedSize: size };

  const [alias, maybeSize] = splitWikiPipe(value);
  const nestedSize = parseEmbedSize(maybeSize?.trim() ?? "");
  return {
    alias: alias?.trim() || undefined,
    embedSize: nestedSize,
  };
}

function parseEmbedSize(value: string): ObsidianEmbedSize | undefined {
  const match = /^(\d+)(?:x(\d+))?$/.exec(value.trim());
  if (!match) return;
  return {
    width: Number(match[1]),
    ...(match[2] ? { height: Number(match[2]) } : {}),
  };
}

// Inside a wikilink, a pipe always separates the target from its alias/size.
// Targets cannot contain a literal pipe, so we split on the first pipe whether
// it is escaped (`\|`) or not. Escaping is required when a wikilink lives inside
// a GFM table cell — otherwise the table parser would treat the pipe as a column
// divider before the wikilink is ever recognized.
function splitWikiPipe(value: string): [string, string?] {
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "\\" && value[index + 1] === "|") {
      return [
        unescapePipes(value.slice(0, index)),
        unescapePipes(value.slice(index + 2)),
      ];
    }
    if (char === "|") {
      return [
        unescapePipes(value.slice(0, index)),
        unescapePipes(value.slice(index + 1)),
      ];
    }
  }
  return [unescapePipes(value)];
}

function unescapePipes(value: string): string {
  return value.replace(/\\\|/g, "|");
}

function formatEmbedSize(size: ObsidianEmbedSize): string {
  return size.height ? `${size.width}x${size.height}` : String(size.width);
}

function visitImages(
  node: Root | { children?: unknown[] },
  visitor: (node: Image) => void,
): void {
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    if (!isNode(child)) continue;
    if (child.type === "image") visitor(child as Image);
    visitImages(child, visitor);
  }
}

function isNode(
  value: unknown,
): value is { type: string; children?: unknown[] } {
  return Boolean(value && typeof value === "object" && "type" in value);
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
