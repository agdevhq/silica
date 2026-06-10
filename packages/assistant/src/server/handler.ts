import { z } from "zod";
import type {
  AssistantSiteContext,
  AssistantStreamEvent,
  AssistantTranscriptMessage,
} from "../types.js";
import { runAssistant, type RunAssistantOptions } from "./runtime.js";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 8_000;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES),
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
  maxToolTurns?: number;
};

export type AssistantHandlerOptions = {
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
    let runtime: AssistantRuntime;
    try {
      runtime = await options.resolve();
    } catch (error) {
      if (error instanceof AssistantUnavailableError) {
        return jsonError(error.message, 503);
      }
      throw error;
    }

    const parsed = requestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError("Invalid assistant request.", 400);
    }
    const transcript = parsed.data.messages as AssistantTranscriptMessage[];
    if (transcript.at(-1)?.role !== "user") {
      return jsonError("The last message must be a user message.", 400);
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: AssistantStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        try {
          await runAssistant({
            model: runtime.model,
            site: runtime.site,
            maxToolTurns: runtime.maxToolTurns,
            transcript,
            emit,
            signal: request.signal,
          });
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

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
