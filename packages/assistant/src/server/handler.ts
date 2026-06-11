import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  AssistantSiteContext,
  AssistantSignedTranscriptMessage,
  AssistantStreamEvent,
  AssistantTranscriptMessage,
} from "../types.js";
import { runAssistant, type RunAssistantOptions } from "./runtime.js";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_SIGNATURE_LENGTH = 256;
const MAX_REQUEST_BODY_BYTES = 512 * 1024;
const SIGNATURE_VERSION = "v1.";
const SIGNATURE_CONTEXT = "silica.assistant.transcript.v1\n";
const messageIdSchema = z.string().uuid();
const previousMessageIdSchema = messageIdSchema.nullable();
const messageContentSchema = z.string().min(1).max(MAX_MESSAGE_LENGTH);

const requestSchema = z.object({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({
          id: messageIdSchema,
          previousMessageId: previousMessageIdSchema,
          role: z.literal("user"),
          content: messageContentSchema,
        }),
        z.object({
          id: messageIdSchema,
          previousMessageId: previousMessageIdSchema,
          role: z.literal("assistant"),
          content: messageContentSchema,
          signature: z.string().min(1).max(MAX_SIGNATURE_LENGTH),
        }),
      ]),
    )
    .min(1)
    .max(MAX_MESSAGES),
  responseMessageId: messageIdSchema,
});

/**
 * Thrown by `resolve` when the assistant cannot run (e.g. the API key
 * environment variable is missing). Reported to the client as a 503 with
 * the given message.
 */
export class AssistantUnavailableError extends Error {}

export type AssistantRuntime = {
  model: RunAssistantOptions["model"];
  site: AssistantSiteContext;
  /** Server-only secret used to sign client-held assistant transcript turns. */
  transcriptSigningSecret: string;
  maxToolTurns?: number;
};

export type AssistantHandlerOptions = {
  /**
   * Optional request gate for auth, quotas, or rate limits. Return a Response to
   * reject before the body is parsed or runtime dependencies are resolved.
   */
  authorizeRequest?: (
    request: Request,
  ) => Response | undefined | Promise<Response | undefined>;
  /** Resolves the model and site context for the current request. */
  resolve: () => AssistantRuntime | Promise<AssistantRuntime>;
};

/**
 * Creates a fetch-style `POST` handler that streams newline-delimited
 * JSON `AssistantStreamEvent`s.
 */
export function createAssistantHandler(
  options: AssistantHandlerOptions,
): (request: Request) => Promise<Response> {
  return async function POST(request: Request): Promise<Response> {
    const authorizationResponse = await options.authorizeRequest?.(request);
    if (authorizationResponse) return authorizationResponse;

    const requestBody = await readRequestBody(request);
    if (!requestBody.success) {
      return jsonError("Assistant request body is too large.", 413);
    }

    const parsedJson = parseJson(requestBody.body);
    const parsed = requestSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return jsonError("Invalid assistant request.", 400);
    }
    const transcript = parsed.data.messages as AssistantTranscriptMessage[];
    if (transcript.at(-1)?.role !== "user") {
      return jsonError("The last message must be a user message.", 400);
    }
    if (
      transcript.some((message) => message.id === parsed.data.responseMessageId)
    ) {
      return jsonError("Invalid assistant transcript.", 400);
    }

    let runtime: AssistantRuntime;
    try {
      runtime = await options.resolve();
    } catch (error) {
      if (error instanceof AssistantUnavailableError) {
        return jsonError(error.message, 503);
      }
      throw error;
    }
    if (!runtime.transcriptSigningSecret) {
      return jsonError(
        "The AI assistant signing secret is not configured.",
        503,
      );
    }
    if (!verifyTranscript(transcript, runtime.transcriptSigningSecret)) {
      return jsonError("Invalid assistant transcript.", 400);
    }
    const assistantMessage = {
      id: parsed.data.responseMessageId,
      previousMessageId: transcript.at(-1)!.id,
      role: "assistant" as const,
    };

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: AssistantStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        try {
          const result = await runAssistant({
            model: runtime.model,
            site: runtime.site,
            maxToolTurns: runtime.maxToolTurns,
            transcript,
            emit,
            signal: request.signal,
          });
          if (!messageContentSchema.safeParse(result.answer).success) {
            emit({
              type: "error",
              message:
                "The assistant returned an invalid answer. Please try again.",
            });
            return;
          }
          emit({
            type: "message-signature",
            id: assistantMessage.id,
            previousMessageId: assistantMessage.previousMessageId,
            signature: signTranscript(
              [...transcript, { ...assistantMessage, content: result.answer }],
              runtime.transcriptSigningSecret,
            ),
          });
          emit({ type: "done" });
        } catch (error) {
          if (!request.signal.aborted) {
            console.error("[silica] assistant request failed:", error);
            emit({
              type: "error",
              message: "The assistant failed to answer. Please try again.",
            });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  };
}

async function readRequestBody(
  request: Request,
): Promise<{ success: true; body: string } | { success: false }> {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BODY_BYTES
  ) {
    return { success: false };
  }

  if (!request.body) return { success: true, body: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { success: false };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return { success: true, body };
  } catch {
    return { success: true, body: "" };
  }
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function verifyTranscript(
  transcript: AssistantTranscriptMessage[],
  secret: string,
): boolean {
  if (!verifyTranscriptChain(transcript)) return false;
  return transcript.every((message, index) => {
    if (message.role !== "assistant") return true;
    return verifySignature(transcript.slice(0, index + 1), message, secret);
  });
}

function verifyTranscriptChain(
  transcript: AssistantTranscriptMessage[],
): boolean {
  const seen = new Set<string>();
  return transcript.every((message, index) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    const previous = transcript[index - 1];
    if (message.previousMessageId !== (previous?.id ?? null)) return false;
    if (index % 2 === 0 && message.role !== "user") return false;
    if (index % 2 === 1 && message.role !== "assistant") return false;
    return true;
  });
}

function verifySignature(
  transcriptPrefix: AssistantTranscriptMessage[],
  message: AssistantSignedTranscriptMessage,
  secret: string,
): boolean {
  if (!message.signature.startsWith(SIGNATURE_VERSION)) return false;
  const expected = signTranscript(transcriptPrefix, secret);
  const actualSignature = Buffer.from(message.signature);
  const expectedSignature = Buffer.from(expected);
  return (
    actualSignature.byteLength === expectedSignature.byteLength &&
    timingSafeEqual(actualSignature, expectedSignature)
  );
}

function signTranscript(
  transcriptPrefix: Array<
    Pick<
      AssistantTranscriptMessage,
      "id" | "previousMessageId" | "role" | "content"
    >
  >,
  secret: string,
): string {
  const payload = JSON.stringify(
    transcriptPrefix.map((message) => ({
      id: message.id,
      previousMessageId: message.previousMessageId,
      role: message.role,
      content: message.content,
    })),
  );
  return (
    SIGNATURE_VERSION +
    createHmac("sha256", secret)
      .update(SIGNATURE_CONTEXT)
      .update(payload)
      .digest("base64url")
  );
}
