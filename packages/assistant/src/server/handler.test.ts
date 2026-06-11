import { describe, expect, it } from "vitest";
import { createChatStream, type ChatModel } from "@core-ai/core-ai";
import type {
  AssistantSignedTranscriptMessage,
  AssistantSiteContext,
  AssistantStreamEvent,
} from "../types.js";
import {
  AssistantUnavailableError,
  createAssistantHandler,
} from "./handler.js";

function createTextModel(text: string): ChatModel {
  return {
    provider: "fake",
    modelId: "fake-model",
    async stream() {
      return createChatStream(
        (async function* () {
          if (text) yield { type: "text-delta" as const, text };
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
}

const fakeModel = createTextModel("Hi there.");

const site: AssistantSiteContext = {
  siteTitle: "Docs",
  contentRoot: process.cwd(),
  resolveCitation: () => undefined,
};
const transcriptSigningSecret = "test-assistant-secret";
const ids = {
  firstUser: "00000000-0000-4000-8000-000000000001",
  firstAssistant: "00000000-0000-4000-8000-000000000002",
  followUpUser: "00000000-0000-4000-8000-000000000003",
  followUpAssistant: "00000000-0000-4000-8000-000000000004",
};

function handler(
  model: ChatModel = fakeModel,
): (request: Request) => Promise<Response> {
  return createAssistantHandler({
    resolve: () => ({
      model,
      site,
      transcriptSigningSecret,
    }),
  });
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createAssistantHandler", () => {
  it("streams NDJSON events for a valid conversation", async () => {
    const response = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("ndjson");

    const events = (await response.text())
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AssistantStreamEvent);
    expect(events).toContainEqual({ type: "text-delta", text: "Hi there." });
    expect(events).toContainEqual({
      type: "message-signature",
      id: ids.firstAssistant,
      previousMessageId: ids.firstUser,
      signature: expect.stringMatching(/^v1\./),
    });
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("rejects invalid request bodies", async () => {
    expect((await handler()(request({ bad: true }))).status).toBe(400);
    expect(
      (
        await handler()(
          request({
            messages: [
              {
                id: ids.firstAssistant,
                previousMessageId: null,
                role: "assistant",
                content: "I speak last.",
                signature: "v1.invalid",
              },
            ],
            responseMessageId: ids.followUpAssistant,
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("rejects request bodies that exceed the byte limit", async () => {
    const response = await handler()(
      new Request("http://localhost/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: ids.firstUser,
              previousMessageId: null,
              role: "user",
              content: "x".repeat(600_000),
            },
          ],
          responseMessageId: ids.firstAssistant,
        }),
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "Assistant request body is too large.",
    });
  });

  it("runs request authorization before resolving the runtime", async () => {
    const response = await createAssistantHandler({
      authorizeRequest: () =>
        Response.json({ error: "Assistant request denied." }, { status: 429 }),
      resolve: () => {
        throw new Error("runtime should not resolve");
      },
    })(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Assistant request denied.",
    });
  });

  it("accepts signed assistant turns in follow-up requests", async () => {
    const firstResponse = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );
    const firstEvents = await readEvents(firstResponse);
    const signature = firstEvents.find(
      (event) => event.type === "message-signature",
    )?.signature;

    expect(signature).toEqual(expect.stringMatching(/^v1\./));

    const assistantTurn: AssistantSignedTranscriptMessage = {
      id: ids.firstAssistant,
      previousMessageId: ids.firstUser,
      role: "assistant",
      content: "Hi there.",
      signature: signature!,
    };
    const followUpResponse = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
          assistantTurn,
          {
            id: ids.followUpUser,
            previousMessageId: ids.firstAssistant,
            role: "user",
            content: "Can you say more?",
          },
        ],
        responseMessageId: ids.followUpAssistant,
      }),
    );

    expect(followUpResponse.status).toBe(200);
  });

  it("rejects tampered signed assistant turns", async () => {
    const firstResponse = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );
    const firstEvents = await readEvents(firstResponse);
    const signature = firstEvents.find(
      (event) => event.type === "message-signature",
    )?.signature;

    const response = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
          {
            id: ids.firstAssistant,
            previousMessageId: ids.firstUser,
            role: "assistant",
            content: "Manipulated answer.",
            signature: signature!,
          },
          {
            id: ids.followUpUser,
            previousMessageId: ids.firstAssistant,
            role: "user",
            content: "Can you say more?",
          },
        ],
        responseMessageId: ids.followUpAssistant,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid assistant transcript.",
    });
  });

  it("rejects broken transcript chains", async () => {
    const response = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
          {
            id: ids.followUpUser,
            previousMessageId: ids.firstUser,
            role: "user",
            content: "Skipped the assistant reply.",
          },
        ],
        responseMessageId: ids.followUpAssistant,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid assistant transcript.",
    });
  });

  it("rejects response IDs that reuse an existing message ID", async () => {
    const response = await handler()(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstUser,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid assistant transcript.",
    });
  });

  it("does not sign assistant answers that cannot be replayed", async () => {
    const response = await handler(createTextModel("x".repeat(8_001)))(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );
    const events = await readEvents(response);

    expect(events).toContainEqual({
      type: "error",
      message: "The assistant returned an invalid answer. Please try again.",
    });
    expect(events.some((event) => event.type === "message-signature")).toBe(
      false,
    );
    expect(events.some((event) => event.type === "done")).toBe(false);
  });

  it("reports unavailability as 503", async () => {
    const handler = createAssistantHandler({
      resolve: () => {
        throw new AssistantUnavailableError("Set OPENAI_API_KEY.");
      },
    });

    const response = await handler(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Set OPENAI_API_KEY." });
  });

  it("requires a transcript signing secret", async () => {
    const handler = createAssistantHandler({
      resolve: () => ({
        model: fakeModel,
        site,
        transcriptSigningSecret: "",
      }),
    });

    const response = await handler(
      request({
        messages: [
          {
            id: ids.firstUser,
            previousMessageId: null,
            role: "user",
            content: "Hello?",
          },
        ],
        responseMessageId: ids.firstAssistant,
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "The AI assistant signing secret is not configured.",
    });
  });
});

async function readEvents(response: Response): Promise<AssistantStreamEvent[]> {
  return (await response.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AssistantStreamEvent);
}
