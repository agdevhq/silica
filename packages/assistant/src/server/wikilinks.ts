import type { AssistantCitation, AssistantWikiLinkResolver } from "../types.js";

export type WikiLinkResolver = (
  target: string,
) => AssistantCitation | undefined | Promise<AssistantCitation | undefined>;

/**
 * Converts assistant-visible Obsidian wikilinks into regular markdown links.
 * Unresolved wikilinks degrade to their visible label so internal targets never
 * leak into the answer UI.
 */
export class AssistantWikiLinkFilter {
  private buffer = "";
  private inFence = false;
  private inlineCodeTicks = 0;
  private lineStart = true;

  constructor(private readonly resolve: WikiLinkResolver) {}

  async push(chunk: string): Promise<string> {
    this.buffer += chunk;
    return this.drain(false);
  }

  async flush(): Promise<string> {
    return this.drain(true);
  }

  private async drain(flush: boolean): Promise<string> {
    let output = "";
    let index = 0;

    while (index < this.buffer.length) {
      if (this.buffer[index] === "`") {
        const tickCount = countBackticks(this.buffer, index);
        if (
          !flush &&
          index + tickCount === this.buffer.length &&
          tickCount < 3
        ) {
          this.buffer = this.buffer.slice(index);
          return output;
        }

        const backticks = this.buffer.slice(index, index + tickCount);
        this.updateCodeState(tickCount);
        output += backticks;
        this.updateLineState(backticks);
        index += tickCount;
        continue;
      }

      const inCode = this.inFence || this.inlineCodeTicks > 0;
      if (!inCode && this.buffer.startsWith("[[", index)) {
        const end = this.buffer.indexOf("]]", index + 2);
        if (end === -1) {
          if (flush) {
            const raw = this.buffer.slice(index);
            output += raw;
            this.updateLineState(raw);
            this.buffer = "";
          } else {
            this.buffer = this.buffer.slice(index);
          }
          return output;
        }

        const rendered = await renderWikiLink(
          this.buffer.slice(index + 2, end),
          this.resolve,
        );
        output += rendered;
        this.updateLineState(rendered);
        index = end + 2;
        continue;
      }

      if (
        !inCode &&
        !flush &&
        this.buffer[index] === "[" &&
        index === this.buffer.length - 1
      ) {
        this.buffer = this.buffer.slice(index);
        return output;
      }

      const char = this.buffer[index]!;
      output += char;
      this.updateLineState(char);
      index += 1;
    }

    this.buffer = "";
    return output;
  }

  private updateCodeState(tickCount: number): void {
    if (this.inFence) {
      if (this.lineStart && tickCount >= 3) this.inFence = false;
      return;
    }

    if (this.inlineCodeTicks > 0) {
      if (tickCount === this.inlineCodeTicks) this.inlineCodeTicks = 0;
      return;
    }

    if (this.lineStart && tickCount >= 3) {
      this.inFence = true;
      return;
    }

    this.inlineCodeTicks = tickCount;
  }

  private updateLineState(text: string): void {
    for (const char of text) {
      if (char === "\n") {
        this.lineStart = true;
      } else if (char !== "\r") {
        this.lineStart = false;
      }
    }
  }
}

export async function resolveAssistantWikiLinks(
  text: string,
  resolve: WikiLinkResolver,
): Promise<string> {
  const filter = new AssistantWikiLinkFilter(resolve);
  return (await filter.push(text)) + (await filter.flush());
}

export function createAssistantWikiLinkFilter(options: {
  currentSourcePath: string;
  resolveWikiLink?: AssistantWikiLinkResolver;
}): AssistantWikiLinkFilter {
  return new AssistantWikiLinkFilter(async (target) =>
    options.resolveWikiLink?.(options.currentSourcePath, target),
  );
}

async function renderWikiLink(
  rawValue: string,
  resolve: WikiLinkResolver,
): Promise<string> {
  const parsed = parseWikiLink(rawValue);
  if (!parsed) return rawValue;

  const citation = await resolve(parsed.target);
  if (!citation) return escapeMarkdownText(parsed.label);

  return `[${escapeMarkdownLinkLabel(parsed.label)}](${citation.href})`;
}

function parseWikiLink(
  rawValue: string,
): { target: string; label: string } | undefined {
  const pipeIndex = findUnescapedPipe(rawValue);
  const rawTarget = pipeIndex === -1 ? rawValue : rawValue.slice(0, pipeIndex);
  const rawLabel = pipeIndex === -1 ? rawTarget : rawValue.slice(pipeIndex + 1);
  const target = unescapeWikiText(rawTarget).trim();
  const label = unescapeWikiText(rawLabel).trim() || target;
  if (!target) return undefined;
  return { target, label };
}

function findUnescapedPipe(value: string): number {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "|") continue;
    let slashCount = 0;
    for (
      let cursor = index - 1;
      cursor >= 0 && value[cursor] === "\\";
      cursor -= 1
    ) {
      slashCount += 1;
    }
    if (slashCount % 2 === 0) return index;
  }
  return -1;
}

function countBackticks(value: string, start: number): number {
  let count = 0;
  while (value[start + count] === "`") count += 1;
  return count;
}

function unescapeWikiText(value: string): string {
  return value.replace(/\\([\\|])/g, "$1");
}

function escapeMarkdownLinkLabel(value: string): string {
  return value.replace(/([\\[\]])/g, "\\$1");
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\[\]])/g, "\\$1");
}
