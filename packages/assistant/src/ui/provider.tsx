"use client";

import * as React from "react";
import { SilicaAssistantProvider } from "@silicajs/components";
import type {
  AssistantCitation,
  AssistantStreamEvent,
  AssistantTranscriptMessage,
} from "../types.js";

export type AssistantChatMessage = {
  id: string;
  previousMessageId: string | null;
  role: "user" | "assistant";
  content: string;
  signature?: string;
  citations: AssistantCitation[];
  state: "streaming" | "complete" | "error";
  /** Shell commands the assistant ran while searching site pages, in order. */
  commands: string[];
  error?: string;
};

export type AssistantContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  messages: AssistantChatMessage[];
  isStreaming: boolean;
  ask: (question: string) => void;
  stop: () => void;
  retry: () => void;
  reset: () => void;
};

const AssistantContext = React.createContext<AssistantContextValue | null>(
  null,
);
const INVALID_STREAM_MESSAGE =
  "The assistant returned an invalid stream response.";

export function useAssistant(): AssistantContextValue | null {
  return React.useContext(AssistantContext);
}

export type AssistantProviderProps = {
  children: React.ReactNode;
  endpoint?: string;
};

function createMessageId(): string {
  return globalThis.crypto.randomUUID();
}

export function buildReplayableHistory(history: AssistantChatMessage[]): {
  messages: AssistantChatMessage[];
  transcript: AssistantTranscriptMessage[];
} {
  const messages: AssistantChatMessage[] = [];
  const transcript: AssistantTranscriptMessage[] = [];

  for (let index = 0; index < history.length; index += 2) {
    const user = history[index];
    const assistant = history[index + 1];
    const previousMessageId = transcript.at(-1)?.id ?? null;

    if (
      !user ||
      user.role !== "user" ||
      user.state !== "complete" ||
      !user.content ||
      user.previousMessageId !== previousMessageId
    ) {
      break;
    }

    if (
      !assistant ||
      assistant.role !== "assistant" ||
      assistant.state !== "complete" ||
      !assistant.content ||
      !assistant.signature ||
      assistant.previousMessageId !== user.id
    ) {
      break;
    }

    messages.push(user, assistant);
    transcript.push(
      {
        id: user.id,
        previousMessageId: user.previousMessageId,
        role: "user",
        content: user.content,
      },
      {
        id: assistant.id,
        previousMessageId: assistant.previousMessageId,
        role: "assistant",
        content: assistant.content,
        signature: assistant.signature,
      },
    );
  }

  return { messages, transcript };
}

export function AssistantProvider({
  children,
  endpoint = "/api/assistant",
}: AssistantProviderProps) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<AssistantChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);

  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  const controllerRef = React.useRef<AbortController | null>(null);

  const updateMessage = React.useCallback(
    (
      id: string,
      update: (message: AssistantChatMessage) => AssistantChatMessage,
    ) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? update(message) : message,
        ),
      );
    },
    [],
  );

  const sendQuestion = React.useCallback(
    (question: string, history: AssistantChatMessage[]) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const replayableHistory = buildReplayableHistory(history);
      const userId = createMessageId();
      const previousMessageId = replayableHistory.transcript.at(-1)?.id ?? null;
      const transcript: AssistantTranscriptMessage[] = [
        ...replayableHistory.transcript,
        {
          id: userId,
          previousMessageId,
          role: "user",
          content: trimmed,
        },
      ];

      const answerId = createMessageId();
      setMessages([
        ...replayableHistory.messages,
        {
          id: userId,
          previousMessageId,
          role: "user",
          content: trimmed,
          citations: [],
          state: "complete",
          commands: [],
        },
        {
          id: answerId,
          previousMessageId: userId,
          role: "assistant",
          content: "",
          citations: [],
          state: "streaming",
          commands: [],
        },
      ]);
      setIsStreaming(true);

      void streamAnswer({
        endpoint,
        transcript,
        responseMessageId: answerId,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "text-delta") {
            updateMessage(answerId, (message) => ({
              ...message,
              content: message.content + event.text,
            }));
          } else if (event.type === "tool-status") {
            updateMessage(answerId, (message) => ({
              ...message,
              commands: [...message.commands, event.command],
            }));
          } else if (event.type === "citations") {
            updateMessage(answerId, (message) => ({
              ...message,
              citations: event.citations,
            }));
          } else if (event.type === "message-signature") {
            updateMessage(answerId, (message) => ({
              ...message,
              id: event.id,
              previousMessageId: event.previousMessageId,
              signature: event.signature,
            }));
          } else if (event.type === "error") {
            updateMessage(answerId, (message) => ({
              ...message,
              state: "error",
              error: event.message,
            }));
          }
        },
      })
        .then((outcome) => {
          updateMessage(answerId, (message) => {
            if (message.state === "error") return message;
            if (outcome === "aborted") {
              return message.content && message.signature
                ? { ...message, state: "complete" }
                : {
                    ...message,
                    state: "error",
                    error: "Answer stopped.",
                  };
            }
            return message.signature
              ? { ...message, state: "complete" }
              : {
                  ...message,
                  state: "error",
                  error: "The assistant reply could not be verified.",
                };
          });
        })
        .catch((error: unknown) => {
          updateMessage(answerId, (message) => ({
            ...message,
            state: "error",
            error:
              error instanceof AssistantRequestError
                ? error.message
                : "The assistant is unavailable right now.",
          }));
        })
        .finally(() => {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
            setIsStreaming(false);
          }
        });
    },
    [endpoint, updateMessage],
  );

  const ask = React.useCallback(
    (question: string) => {
      sendQuestion(question, messagesRef.current);
    },
    [sendQuestion],
  );

  const stop = React.useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const retry = React.useCallback(() => {
    if (controllerRef.current) return;
    const current = messagesRef.current;
    for (let index = current.length - 1; index >= 0; index -= 1) {
      const message = current[index];
      if (message?.role === "user") {
        sendQuestion(message.content, current.slice(0, index));
        return;
      }
    }
  }, [sendQuestion]);

  const reset = React.useCallback(() => {
    controllerRef.current?.abort();
    setMessages([]);
  }, []);

  const value = React.useMemo<AssistantContextValue>(
    () => ({ open, setOpen, messages, isStreaming, ask, stop, retry, reset }),
    [open, messages, isStreaming, ask, stop, retry, reset],
  );

  const bridge = React.useMemo(
    () => ({
      open,
      openAssistant: (query?: string) => {
        setOpen(true);
        if (query?.trim()) ask(query);
      },
      closeAssistant: () => setOpen(false),
    }),
    [open, ask],
  );

  return (
    <AssistantContext.Provider value={value}>
      <SilicaAssistantProvider value={bridge}>
        {children}
      </SilicaAssistantProvider>
    </AssistantContext.Provider>
  );
}

class AssistantRequestError extends Error {}

export async function streamAnswer(options: {
  endpoint: string;
  transcript: AssistantTranscriptMessage[];
  responseMessageId: string;
  signal: AbortSignal;
  onEvent: (event: AssistantStreamEvent) => void;
}): Promise<"done" | "aborted"> {
  let response: Response;
  try {
    response = await fetch(options.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: options.transcript,
        responseMessageId: options.responseMessageId,
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal.aborted) return "aborted";
    throw error;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as
      | { error?: string }
      | undefined;
    throw new AssistantRequestError(
      payload?.error ?? "The assistant is unavailable right now.",
    );
  }
  if (!response.body) {
    throw new AssistantRequestError(
      "The assistant returned an empty response.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) emitStreamEvent(line, options.onEvent);
        newlineIndex = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    const leftover = buffer.trim();
    if (leftover) emitStreamEvent(leftover, options.onEvent);
  } catch (error) {
    if (options.signal.aborted) return "aborted";
    throw error;
  }
  return "done";
}

function emitStreamEvent(
  line: string,
  onEvent: (event: AssistantStreamEvent) => void,
): void {
  let event: AssistantStreamEvent;
  try {
    event = JSON.parse(line) as AssistantStreamEvent;
  } catch {
    onEvent({ type: "error", message: INVALID_STREAM_MESSAGE });
    throw new AssistantRequestError(INVALID_STREAM_MESSAGE);
  }
  onEvent(event);
}
