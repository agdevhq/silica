import {
  defineTool,
  resultToMessage,
  stream,
  type ChatModel,
  type Message,
  type ToolChoice,
} from "@core-ai/core-ai";
import { z } from "zod";
import type {
  AssistantSiteContext,
  AssistantStreamEvent,
  AssistantTranscriptMessage,
} from "../types.js";
import { buildSystemPrompt } from "./prompt.js";
import { resolveCitations, SourceTagFilter } from "./sources.js";
import { createContentSandbox, type ContentSandbox } from "./tools.js";
import { createAssistantWikiLinkFilter } from "./wikilinks.js";

const DEFAULT_MAX_TOOL_TURNS = 8;

const bashTool = defineTool({
  name: "bash",
  description:
    "Run a read-only shell command over the site's markdown files " +
    '(find . -name "*.md", grep, cat, head, tail, wc, …). The content root is /.',
  parameters: z.object({
    command: z.string().describe("The shell command to execute."),
  }),
});

export type RunAssistantOptions = {
  model: ChatModel;
  site: AssistantSiteContext;
  transcript: AssistantTranscriptMessage[];
  emit: (event: AssistantStreamEvent) => void;
  signal?: AbortSignal;
  maxToolTurns?: number;
  currentSourcePath?: string;
  /** Test seam; defaults to a just-bash sandbox over the site's content root. */
  sandbox?: ContentSandbox;
};

export type RunAssistantResult = {
  answer: string;
};

/**
 * Citation-first docs loop: stream the model, execute constrained shell
 * commands over the markdown content when the model asks for them, and
 * finish with the cited answer.
 */
export async function runAssistant(
  options: RunAssistantOptions,
): Promise<RunAssistantResult> {
  const { model, site, transcript, emit, signal } = options;
  const maxToolTurns = options.maxToolTurns ?? DEFAULT_MAX_TOOL_TURNS;
  const sandbox = options.sandbox ?? createContentSandbox(site);
  const wikiLinkFilter = createAssistantWikiLinkFilter({
    currentSourcePath:
      options.currentSourcePath ??
      site.currentPage?.sourcePath ??
      site.homePage?.sourcePath ??
      "index.md",
    resolveWikiLink: site.resolveWikiLink,
  });

  const messages: Message[] = [
    { role: "system", content: buildSystemPrompt(site) },
    ...transcript.map(
      (message): Message =>
        message.role === "user"
          ? { role: "user", content: message.content }
          : {
              role: "assistant",
              parts: [{ type: "text", text: message.content }],
            },
    ),
  ];

  let sources: string[] = [];
  let emittedText = false;
  let answer = "";
  const emitText = (text: string) => {
    answer += text;
    emit({ type: "text-delta", text });
  };

  for (let turn = 0; turn <= maxToolTurns; turn += 1) {
    const isFinalTurn = turn === maxToolTurns;
    const toolChoice: ToolChoice = isFinalTurn ? "none" : "auto";
    const chatStream = await stream({
      model,
      messages,
      tools: { bash: bashTool },
      toolChoice,
      signal,
    });

    const filter = new SourceTagFilter();
    let emittedThisTurn = false;
    const emitVisible = (text: string) => {
      if (!text) return;
      if (emittedText && !emittedThisTurn) {
        emitText("\n\n");
      }
      emitText(text);
      emittedText = true;
      emittedThisTurn = true;
    };
    for await (const event of chatStream) {
      if (event.type !== "text-delta") continue;
      const visible = filter.push(event.text);
      if (!visible) continue;
      emitVisible(await wikiLinkFilter.push(visible));
    }

    const flushed = filter.flush();
    if (flushed.text.trim()) {
      emitVisible(await wikiLinkFilter.push(flushed.text));
    }
    emitVisible(await wikiLinkFilter.flush());
    if (flushed.sources.length > 0) sources = flushed.sources;

    const result = await chatStream.result;
    if (result.finishReason !== "tool-calls" || result.toolCalls.length === 0) {
      break;
    }

    messages.push(resultToMessage(result));
    for (const toolCall of result.toolCalls) {
      const command = String(toolCall.arguments.command ?? "");
      emit({ type: "tool-status", command });
      messages.push({
        role: "tool",
        toolCallId: toolCall.id,
        ...(await executeBashCall(sandbox, command, signal)),
      });
    }
  }

  emit({ type: "citations", citations: await resolveCitations(site, sources) });
  return { answer };
}

async function executeBashCall(
  sandbox: ContentSandbox,
  command: string,
  signal: AbortSignal | undefined,
): Promise<{ content: string; isError?: boolean }> {
  if (!command) {
    return { content: "No command provided.", isError: true };
  }
  try {
    return { content: await sandbox.run(command, signal) };
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      content: `Command failed: ${error instanceof Error ? error.message : String(error)}`,
      isError: true,
    };
  }
}
