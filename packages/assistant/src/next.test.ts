import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChatStream, type ChatModel } from "@core-ai/core-ai";
import { createAssistantRouteHandler } from "./next.js";

vi.mock("@silicajs/next/server-data", () => ({
  getConfig: () => ({
    title: "Docs",
    description: "Test docs",
    assistant: {
      provider: "openai",
      model: "fake-model",
      apiKeyEnv: "OPENAI_API_KEY",
    },
    wikilinks: { strategy: "shortest" },
    ordering: [],
  }),
  getPage: () => undefined,
  getPageBySourcePath: () => undefined,
  getProjectRoot: () => process.cwd(),
  resolveWikiLinkFromDb: () => undefined,
}));

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

const ids = {
  firstUser: "00000000-0000-4000-8000-000000000001",
  firstAssistant: "00000000-0000-4000-8000-000000000002",
};

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
const originalAssistantSecret = process.env.SILICA_ASSISTANT_SECRET;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-api-key";
  process.env.SILICA_ASSISTANT_SECRET = "test-assistant-secret";
});

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalOpenAiApiKey);
  restoreEnv("SILICA_ASSISTANT_SECRET", originalAssistantSecret);
});

describe("createAssistantRouteHandler rate limiting", () => {
  it("keys the default rate limit by x-forwarded-for", async () => {
    const handler = routeHandler({ maxRequests: 1, windowMs: 60_000 });
    const headers = {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    };

    expect((await handler(request(headers))).status).toBe(200);

    const response = await handler(request(headers));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many assistant requests. Please try again shortly.",
    });
  });

  it("ignores proxy headers that are not configured", async () => {
    const handler = routeHandler({ maxRequests: 1, windowMs: 60_000 });

    expect(
      (await handler(request({ "x-real-ip": "203.0.113.20" }))).status,
    ).toBe(200);

    expect(
      (await handler(request({ "x-real-ip": "203.0.113.21" }))).status,
    ).toBe(429);
  });

  it("uses configured trusted proxy headers", async () => {
    const handler = routeHandler({
      maxRequests: 1,
      windowMs: 60_000,
      trustedProxyHeaders: ["x-real-ip"],
    });

    expect(
      (await handler(request({ "x-real-ip": "203.0.113.30" }))).status,
    ).toBe(200);
    expect(
      (await handler(request({ "x-real-ip": "203.0.113.30" }))).status,
    ).toBe(429);
    expect(
      (await handler(request({ "x-real-ip": "203.0.113.31" }))).status,
    ).toBe(200);
  });

  it("uses a custom rate-limit key when provided", async () => {
    const handler = routeHandler({
      maxRequests: 1,
      windowMs: 60_000,
      key: async (request) => request.headers.get("x-session-id") ?? "",
    });

    expect(
      (
        await handler(
          request({
            "x-forwarded-for": "203.0.113.40",
            "x-session-id": "session-a",
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          request({
            "x-forwarded-for": "203.0.113.40",
            "x-session-id": "session-b",
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          request({
            "x-forwarded-for": "203.0.113.41",
            "x-session-id": "session-a",
          }),
        )
      ).status,
    ).toBe(429);
  });
});

function routeHandler(
  rateLimit: NonNullable<
    Parameters<typeof createAssistantRouteHandler>[0]["rateLimit"]
  >,
): (request: Request) => Promise<Response> {
  return createAssistantRouteHandler({
    rateLimit,
    createChatModel: () => fakeModel,
  });
}

function request(headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
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
  });
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
