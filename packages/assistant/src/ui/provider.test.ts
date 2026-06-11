import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantChatMessage } from "./provider.js";
import { buildReplayableHistory, streamAnswer } from "./provider.js";
import type { AssistantStreamEvent } from "../types.js";

function message(
  overrides: Partial<AssistantChatMessage> & Pick<AssistantChatMessage, "id">,
): AssistantChatMessage {
  const { id, ...rest } = overrides;
  return {
    id,
    previousMessageId: null,
    role: "user",
    content: "Question?",
    citations: [],
    state: "complete",
    commands: [],
    ...rest,
  };
}

describe("buildReplayableHistory", () => {
  it("keeps complete signed user and assistant pairs", () => {
    const history = buildReplayableHistory([
      message({ id: "user-1" }),
      message({
        id: "assistant-1",
        previousMessageId: "user-1",
        role: "assistant",
        content: "Answer.",
        signature: "v1.signature-1",
      }),
      message({
        id: "user-2",
        previousMessageId: "assistant-1",
      }),
      message({
        id: "assistant-2",
        previousMessageId: "user-2",
        role: "assistant",
        content: "Follow-up.",
        signature: "v1.signature-2",
      }),
    ]);

    expect(history.messages.map((entry) => entry.id)).toEqual([
      "user-1",
      "assistant-1",
      "user-2",
      "assistant-2",
    ]);
    expect(history.transcript).toEqual([
      {
        id: "user-1",
        previousMessageId: null,
        role: "user",
        content: "Question?",
      },
      {
        id: "assistant-1",
        previousMessageId: "user-1",
        role: "assistant",
        content: "Answer.",
        signature: "v1.signature-1",
      },
      {
        id: "user-2",
        previousMessageId: "assistant-1",
        role: "user",
        content: "Question?",
      },
      {
        id: "assistant-2",
        previousMessageId: "user-2",
        role: "assistant",
        content: "Follow-up.",
        signature: "v1.signature-2",
      },
    ]);
  });

  it("drops a dangling user turn when the assistant reply is not signed", () => {
    const history = buildReplayableHistory([
      message({ id: "user-1" }),
      message({
        id: "assistant-1",
        previousMessageId: "user-1",
        role: "assistant",
        content: "Unsigned answer.",
      }),
      message({
        id: "user-2",
        previousMessageId: "assistant-1",
      }),
    ]);

    expect(history.messages).toEqual([]);
    expect(history.transcript).toEqual([]);
  });
});

describe("streamAnswer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces malformed stream events as assistant errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"type":')),
    );
    const events: AssistantStreamEvent[] = [];

    await expect(
      streamAnswer({
        endpoint: "/api/assistant",
        transcript: [],
        responseMessageId: "assistant-1",
        signal: new AbortController().signal,
        onEvent: (event) => events.push(event),
      }),
    ).rejects.toThrow("The assistant returned an invalid stream response.");

    expect(events).toEqual([
      {
        type: "error",
        message: "The assistant returned an invalid stream response.",
      },
    ]);
  });

  it("handles a final stream event without a trailing newline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"type":"done"}')),
    );
    const events: AssistantStreamEvent[] = [];

    await expect(
      streamAnswer({
        endpoint: "/api/assistant",
        transcript: [],
        responseMessageId: "assistant-1",
        signal: new AbortController().signal,
        onEvent: (event) => events.push(event),
      }),
    ).resolves.toBe("done");

    expect(events).toEqual([{ type: "done" }]);
  });

  it("includes current page context in assistant requests", async () => {
    const fetch = vi.fn(async () => new Response('{"type":"done"}'));
    vi.stubGlobal("fetch", fetch);

    await streamAnswer({
      endpoint: "/api/assistant",
      transcript: [],
      responseMessageId: "assistant-1",
      currentSourcePath: "writing/frontmatter.md",
      currentSlug: "writing/frontmatter",
      signal: new AbortController().signal,
      onEvent: () => undefined,
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/assistant",
      expect.objectContaining({
        body: JSON.stringify({
          messages: [],
          responseMessageId: "assistant-1",
          currentSourcePath: "writing/frontmatter.md",
          currentSlug: "writing/frontmatter",
        }),
      }),
    );
  });
});
