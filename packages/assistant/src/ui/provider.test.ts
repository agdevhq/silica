import { describe, expect, it } from "vitest";
import type { AssistantChatMessage } from "./provider.js";
import { buildReplayableHistory } from "./provider.js";

function message(
  overrides: Partial<AssistantChatMessage> & Pick<AssistantChatMessage, "id">,
): AssistantChatMessage {
  return {
    id: overrides.id,
    previousMessageId: null,
    role: "user",
    content: "Question?",
    citations: [],
    state: "complete",
    commands: [],
    ...overrides,
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
