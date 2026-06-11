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
  contentRoot: "/project/.silica/content",
  resolveCitation: (sourcePath) =>
    sourcePath === "guides/install.md"
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
  options?: { maxToolTurns?: number; commands?: string[] },
): Promise<AssistantStreamEvent[]> {
  const events: AssistantStreamEvent[] = [];
  await runAssistant({
    model,
    site,
    transcript: [{ role: "user", content: "How do I install?" }],
    emit: (event) => events.push(event),
    maxToolTurns: options?.maxToolTurns,
    sandbox: {
      run: async (command) => {
        options?.commands?.push(command);
        return "guides/install.md: run npm install";
      },
    },
  });
  return events;
}

describe("runAssistant", () => {
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
    const events = await collectEvents(model, { commands });

    expect(commands).toEqual(["grep -ril install ."]);
    expect(events).toContainEqual({
      type: "tool-status",
      command: "grep -ril install .",
    });

    const answer = events
      .filter((event) => event.type === "text-delta")
      .map((event) => event.text)
      .join("");
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
    expect(events.at(-1)).toEqual({ type: "done" });

    // Second model call must include the tool result message.
    expect(calls).toHaveLength(2);
    expect(calls[1]?.messages.at(-1)).toMatchObject({
      role: "tool",
      toolCallId: "call-1",
    });
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

    const events = await collectEvents(model, { maxToolTurns: 1 });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.toolChoice).toBe("auto");
    expect(calls[1]?.toolChoice).toBe("none");
    expect(events.at(-1)).toEqual({ type: "done" });
  });
});
