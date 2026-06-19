import { describe, expect, it } from "vitest";
import {
  createChatStream,
  type ChatModel,
  type GenerateOptions,
  type StreamEvent,
} from "@core-ai/core-ai";
import type { AssistantSiteContext, AssistantStreamEvent } from "../types.js";
import { runAssistant } from "./runtime.js";

const site: AssistantSiteContext = {
  siteTitle: "Docs",
  contentRoot: "/project/.silica/next/data/content",
  resolveCitation: (sourcePath) =>
    sourcePath === "guides/install.md"
      ? {
          slug: "guides/install",
          title: "Install",
          href: "/guides/install",
          sourcePath: "guides/install.md",
        }
      : undefined,
  resolveWikiLink: (_currentSourcePath, target) =>
    target === "Install"
      ? {
          slug: "guides/install",
          title: "Install",
          href: "/guides/install",
          sourcePath: "guides/install.md",
        }
      : undefined,
};

function createScriptedModel(script: StreamEvent[][]): {
  model: ChatModel;
  calls: GenerateOptions[];
} {
  const calls: GenerateOptions[] = [];
  const model: ChatModel = {
    provider: "fake",
    modelId: "fake-model",
    async stream(options) {
      calls.push(options);
      const events = script[Math.min(calls.length - 1, script.length - 1)]!;
      return createChatStream(
        (async function* () {
          yield* events;
        })(),
      );
    },
    generate: () => Promise.reject(new Error("not implemented")),
    generateObject: () => Promise.reject(new Error("not implemented")),
    streamObject: () => Promise.reject(new Error("not implemented")),
  };
  return { model, calls };
}

const finish = (finishReason: "stop" | "tool-calls"): StreamEvent => ({
  type: "finish",
  finishReason,
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 0 },
    outputTokenDetails: {},
  },
});

async function collectEvents(
  model: ChatModel,
  options?: { maxToolTurns?: number; commands?: string[]; question?: string },
): Promise<{ events: AssistantStreamEvent[]; answer: string }> {
  const events: AssistantStreamEvent[] = [];
  const result = await runAssistant({
    model,
    site,
    transcript: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        previousMessageId: null,
        role: "user",
        content: options?.question ?? "How do I install?",
      },
    ],
    emit: (event) => events.push(event),
    maxToolTurns: options?.maxToolTurns,
    sandbox: {
      run: async (command) => {
        options?.commands?.push(command);
        return "guides/install.md: run npm install";
      },
    },
  });
  return { events, answer: result.answer };
}

describe("runAssistant", () => {
  it("allows simple requests to complete without tool calls", async () => {
    const { model, calls } = createScriptedModel([
      [
        { type: "text-delta", text: "Hello! How can I help with Docs?" },
        finish("stop"),
      ],
    ]);

    const commands: string[] = [];
    const { events, answer } = await collectEvents(model, {
      commands,
      question: "Hello",
    });

    expect(calls).toHaveLength(1);
    expect(commands).toEqual([]);
    expect(events).not.toContainEqual({
      type: "tool-status",
      command: expect.any(String),
    });
    expect(answer).toBe("Hello! How can I help with Docs?");
  });

  it("executes tool calls and streams the cited answer", async () => {
    const { model, calls } = createScriptedModel([
      [
        {
          type: "tool-call-end",
          toolCall: {
            id: "call-1",
            name: "bash",
            arguments: { command: "grep -ril install ." },
          },
        },
        finish("tool-calls"),
      ],
      [
        { type: "text-delta", text: "Run `npm install`." },
        { type: "text-delta", text: "\n\n<sources>\nguides/install.md\n" },
        { type: "text-delta", text: "</sources>" },
        finish("stop"),
      ],
    ]);

    const commands: string[] = [];
    const { events, answer } = await collectEvents(model, { commands });

    expect(commands).toEqual(["grep -ril install ."]);
    expect(events).toContainEqual({
      type: "tool-status",
      command: "grep -ril install .",
    });

    const streamedAnswer = events
      .filter((event) => event.type === "text-delta")
      .map((event) => event.text)
      .join("");
    expect(streamedAnswer).toBe("Run `npm install`.");
    expect(answer).toBe("Run `npm install`.");

    expect(events).toContainEqual({
      type: "citations",
      citations: [
        {
          slug: "guides/install",
          title: "Install",
          href: "/guides/install",
          sourcePath: "guides/install.md",
        },
      ],
    });
    expect(events.at(-1)).toEqual({
      type: "citations",
      citations: [
        {
          slug: "guides/install",
          title: "Install",
          href: "/guides/install",
          sourcePath: "guides/install.md",
        },
      ],
    });

    // Second model call must include the tool result message.
    expect(calls).toHaveLength(2);
    expect(calls[1]?.messages.at(-1)).toMatchObject({
      role: "tool",
      toolCallId: "call-1",
    });
  });

  it("converts assistant wikilinks in visible streamed text", async () => {
    const { model } = createScriptedModel([
      [
        { type: "text-delta", text: "Open [[Inst" },
        { type: "text-delta", text: "all]] for setup." },
        finish("stop"),
      ],
    ]);

    const { events, answer } = await collectEvents(model);
    const streamedAnswer = events
      .filter((event) => event.type === "text-delta")
      .map((event) => event.text)
      .join("");

    expect(streamedAnswer).toBe("Open [Install](/guides/install) for setup.");
    expect(answer).toBe("Open [Install](/guides/install) for setup.");
  });

  it("forces a final answer when tool turns are exhausted", async () => {
    const { model, calls } = createScriptedModel([
      [
        {
          type: "tool-call-end",
          toolCall: {
            id: "call-1",
            name: "bash",
            arguments: { command: "ls" },
          },
        },
        finish("tool-calls"),
      ],
      [{ type: "text-delta", text: "Partial answer." }, finish("stop")],
    ]);

    const { events } = await collectEvents(model, { maxToolTurns: 1 });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.toolChoice).toBe("auto");
    expect(calls[1]?.toolChoice).toBe("none");
    expect(events.at(-1)).toEqual({ type: "citations", citations: [] });
  });
});
