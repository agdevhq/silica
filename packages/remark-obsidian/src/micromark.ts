import type {
  Code,
  Construct,
  Effects,
  Exiter,
  Extension,
  State,
  TokenizeContext,
  Tokenizer,
} from "micromark-util-types";
import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding, markdownSpace } from "micromark-util-character";
import { readInlineTag } from "./tags.js";
import type { RemarkObsidianOptions } from "./types.js";

declare module "micromark-util-types" {
  interface TokenTypeMap {
    obsidianCallout: "obsidianCallout";
    obsidianCalloutMarker: "obsidianCalloutMarker";
    obsidianWikilink: "obsidianWikilink";
    obsidianWikiEmbed: "obsidianWikiEmbed";
    obsidianHighlight: "obsidianHighlight";
    obsidianTag: "obsidianTag";
  }
}

export function obsidian(options: RemarkObsidianOptions = {}): Extension {
  const text = {
    33: tokenizeWikiEmbed,
    61: tokenizeHighlight,
    91: tokenizeWikilink,
    ...((options.inlineTags ?? true) ? { 35: tokenizeTag } : {}),
  };

  return {
    document: {
      62: tokenizeCallout,
    },
    text,
  };
}

const tokenizeWikilink: Construct = {
  name: "obsidianWikilink",
  tokenize(effects, ok, nok) {
    return tokenizeBracketed(effects, ok, nok, "obsidianWikilink", "[[");
  },
};

const tokenizeWikiEmbed: Construct = {
  name: "obsidianWikiEmbed",
  tokenize(effects, ok, nok) {
    return tokenizeBracketed(effects, ok, nok, "obsidianWikiEmbed", "![[");
  },
};

const tokenizeHighlight: Construct = {
  name: "obsidianHighlight",
  tokenize(effects, ok, nok) {
    let seenContent = false;

    return start;

    function start(code: Code): State | undefined {
      if (code !== 61) return nok(code);
      effects.enter("obsidianHighlight");
      effects.consume(code);
      return openSecond;
    }

    function openSecond(code: Code): State | undefined {
      if (code !== 61) return nok(code);
      effects.consume(code);
      return content;
    }

    function content(code: Code): State | undefined {
      if (code === null || code < 0) return nok(code);
      if (code === 61) {
        effects.consume(code);
        return closeSecond;
      }
      seenContent = true;
      effects.consume(code);
      return content;
    }

    function closeSecond(code: Code): State | undefined {
      if (code === 61 && seenContent) {
        effects.consume(code);
        effects.exit("obsidianHighlight");
        return ok;
      }
      if (code === null || code < 0) return nok(code);
      seenContent = true;
      effects.consume(code);
      return content;
    }
  },
};

const tokenizeTag: Construct = {
  name: "obsidianTag",
  tokenize(effects, ok, nok) {
    const previous = this.previous;
    let value = "";

    return start;

    function start(code: Code): State | undefined {
      if (code !== 35 || !isTagBoundary(previous)) {
        return nok(code);
      }
      effects.enter("obsidianTag");
      value += "#";
      effects.consume(code);
      return more;
    }

    function more(code: Code): State | undefined {
      if (code === null || code < 0) return done(code);
      const char = String.fromCharCode(code);
      if (!isInlineTagChar(char)) {
        return done(code);
      }
      value += char;
      effects.consume(code);
      return more;
    }

    function done(code: Code): State | undefined {
      if (!readInlineTag(value, 0)) return nok(code);
      effects.exit("obsidianTag");
      return ok(code);
    }
  },
};

const tokenizeCalloutStart: Tokenizer = function tokenizeCalloutStart(
  this: TokenizeContext,
  effects,
  ok,
  nok,
) {
  const self = this;
  let calloutState: NonNullable<TokenizeContext["containerState"]> | undefined;
  let seenKind = false;

  return start;

  function start(code: Code): State | undefined {
    if (code !== 62) return nok(code);

    const state = self.containerState ?? (self.containerState = {});
    calloutState = state;
    if (!state.open) {
      effects.enter("obsidianCallout", { _container: true });
      state.open = true;
    }

    return prefixStart(code);
  }

  function prefixStart(code: Code): State | undefined {
    effects.enter("blockQuotePrefix");
    effects.enter("blockQuoteMarker");
    effects.consume(code);
    effects.exit("blockQuoteMarker");
    return prefixAfter;
  }

  function prefixAfter(code: Code): State | undefined {
    if (markdownSpace(code)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return markerStart;
    }

    effects.exit("blockQuotePrefix");
    return markerStart(code);
  }

  function markerStart(code: Code): State | undefined {
    if (code !== 91) return fail(code);
    effects.enter("obsidianCalloutMarker");
    effects.consume(code);
    return markerBang;
  }

  function markerBang(code: Code): State | undefined {
    if (code !== 33) return fail(code);
    effects.consume(code);
    return markerKind;
  }

  function markerKind(code: Code): State | undefined {
    if (isCalloutKindCode(code)) {
      seenKind = true;
      effects.consume(code);
      return markerKind;
    }

    if (code === 93 && seenKind) {
      effects.consume(code);
      return markerFold;
    }

    return fail(code);
  }

  function markerFold(code: Code): State | undefined {
    if (code === 43 || code === 45) {
      effects.consume(code);
      return markerTitleBefore;
    }

    return markerTitleBefore(code);
  }

  function markerTitleBefore(code: Code): State | undefined {
    if (markdownSpace(code)) {
      effects.consume(code);
      return markerTitleBefore;
    }

    if (code === null || markdownLineEnding(code)) {
      effects.exit("obsidianCalloutMarker");
      return ok(code);
    }

    return markerTitle(code);
  }

  function markerTitle(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("obsidianCalloutMarker");
      return ok(code);
    }

    effects.consume(code);
    return markerTitle;
  }

  function fail(code: Code): State | undefined {
    if (calloutState) {
      calloutState.open = false;
    }
    return nok(code);
  }
};

const tokenizeCalloutContinuation: Tokenizer =
  function tokenizeCalloutContinuation(
    this: TokenizeContext,
    effects,
    ok,
    nok,
  ) {
    const self = this;
    return contStart;

    function contStart(code: Code): State | undefined {
      if (markdownSpace(code)) {
        return factorySpace(
          effects,
          contBefore,
          "linePrefix",
          self.parser.constructs.disable.null?.includes("codeIndented")
            ? undefined
            : 4,
        )(code);
      }

      return contBefore(code);
    }

    function contBefore(code: Code): State | undefined {
      return effects.attempt(calloutContinuationPrefix, ok, nok)(code);
    }
  };

const calloutContinuationPrefix: Construct = {
  partial: true,
  tokenize(effects, ok, nok) {
    return start;

    function start(code: Code): State | undefined {
      if (code !== 62) return nok(code);
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code);
      effects.exit("blockQuoteMarker");
      return after;
    }

    function after(code: Code): State | undefined {
      if (markdownSpace(code)) {
        effects.enter("blockQuotePrefixWhitespace");
        effects.consume(code);
        effects.exit("blockQuotePrefixWhitespace");
      }

      effects.exit("blockQuotePrefix");
      return ok(code);
    }
  },
};

const exitCallout: Exiter = function exitCallout(effects) {
  effects.exit("obsidianCallout");
};

const tokenizeCallout: Construct = {
  continuation: {
    tokenize: tokenizeCalloutContinuation,
  },
  exit: exitCallout,
  name: "obsidianCallout",
  tokenize: tokenizeCalloutStart,
};

function isCalloutKindCode(code: Code): boolean {
  return (
    code !== null &&
    ((code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      code === 95 ||
      (code >= 97 && code <= 122) ||
      code === 45)
  );
}

function isTagBoundary(code: Code): boolean {
  return (
    code === null ||
    code === 32 ||
    code === 9 ||
    code === 10 ||
    code === 13 ||
    code === 40 ||
    code === 91 ||
    code === 123 ||
    code === 62
  );
}

function isInlineTagChar(char: string): boolean {
  return !/[\s<>"'`\\#[\](){}.,;:!?]/u.test(char);
}

function tokenizeBracketed(
  effects: Effects,
  ok: State,
  nok: State,
  tokenType: "obsidianWikilink" | "obsidianWikiEmbed",
  opener: "[[" | "![[",
): State {
  let openerIndex = 0;
  let seenContent = false;

  return start;

  function start(code: Code): State | undefined {
    if (code !== opener.charCodeAt(0)) return nok(code);
    effects.enter(tokenType);
    effects.consume(code);
    openerIndex = 1;
    return open;
  }

  function open(code: Code): State | undefined {
    if (openerIndex < opener.length) {
      if (code !== opener.charCodeAt(openerIndex)) return nok(code);
      effects.consume(code);
      openerIndex += 1;
      return open;
    }
    return content(code);
  }

  function content(code: Code): State | undefined {
    if (code === null || code < 0) return nok(code);
    if (code === 93) {
      effects.consume(code);
      return closeSecond;
    }
    seenContent = true;
    effects.consume(code);
    return content;
  }

  function closeSecond(code: Code): State | undefined {
    if (code === 93 && seenContent) {
      effects.consume(code);
      effects.exit(tokenType);
      return ok;
    }
    if (code === null || code < 0) return nok(code);
    seenContent = true;
    effects.consume(code);
    return content;
  }
}
