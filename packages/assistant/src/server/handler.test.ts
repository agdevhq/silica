import { describe, expect, it } from "vitest";
import { createChatStream, type ChatModel } from "@core-ai/core-ai";
import type { AssistantStreamEvent } from "../types.js";
import {
  AssistantUnavailableError,
  createAssistantHandler,
} from "./handler.js";

const fakeModel: ChatModel = {
  provider: "fake",
  modelId: "fake-model",
  async stream() {
    return createChatStream(
      (async function* () {
        yield { type: "text-delta" as const, text: "Hi there." };
        yield {
          type: "finish" as const,
          finishReason: "stop" as const,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 0 },
            outputTokenDetails: {},
          },
        };
      })(),
    );
  },
  generate: () => Promise.reject(new Error("not implemented")),
  generateObject: () => Promise.reject(new Error("not implemented")),
  streamObject: () => Promise.reject(new Error("not implemented")),
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createAssistantHandler", () => {
  it("streams NDJSON events for a valid conversation", async () => {
    const handler = createAssistantHandler({
      resolve: () => ({
        model: fakeModel,
        site: { siteTitle: "Docs", pages: [] },
      }),
    });

    const response = await handler(
      request({ messages: [{ role: "user", content: "Hello?" }] }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("ndjson");

    const events = (await response.text())
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AssistantStreamEvent);
    expect(events).toContainEqual({ type: "text-delta", text: "Hi there." });
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("rejects invalid request bodies", async () => {
    const handler = createAssistantHandler({
      resolve: () => ({
        model: fakeModel,
        site: { siteTitle: "Docs", pages: [] },
      }),
    });

    expect((await handler(request({ bad: true }))).status).toBe(400);
    expect(
      (
        await handler(
          request({
            messages: [{ role: "assistant", content: "I speak last." }],
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("reports unavailability as 503", async () => {
    const handler = createAssistantHandler({
      resolve: () => {
        throw new AssistantUnavailableError("Set OPENAI_API_KEY.");
      },
    });

    const response = await handler(
      request({ messages: [{ role: "user", content: "Hello?" }] }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Set OPENAI_API_KEY." });
  });
});
