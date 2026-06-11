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
  role: "user" | "assistant";
  content: string;
  citations: AssistantCitation[];
  state: "streaming" | "complete" | "error";
  /** Last shell command while the assistant is exploring the docs. */
  activity?: string;
  error?: string;
};

export type AssistantContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
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

export function useAssistant(): AssistantContextValue | null {
  return React.useContext(AssistantContext);
}

export type AssistantProviderProps = {
  children: React.ReactNode;
  endpoint?: string;
};

let nextMessageId = 0;
function createMessageId(): string {
  nextMessageId += 1;
  return `assistant-message-${nextMessageId}`;
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

  const ask = React.useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const transcript: AssistantTranscriptMessage[] = [
        ...messagesRef.current
          .filter((message) => message.state === "complete" && message.content)
          .map((message) => ({ role: message.role, content: message.content })),
        { role: "user" as const, content: trimmed },
      ];

      const answerId = createMessageId();
      setMessages((current) => [
        ...current.filter((message) => message.state !== "error"),
        {
          id: createMessageId(),
          role: "user",
          content: trimmed,
          citations: [],
          state: "complete",
        },
        {
          id: answerId,
          role: "assistant",
          content: "",
          citations: [],
          state: "streaming",
        },
      ]);
      setIsStreaming(true);

      void streamAnswer({
        endpoint,
        transcript,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "text-delta") {
            updateMessage(answerId, (message) => ({
              ...message,
              content: message.content + event.text,
              activity: undefined,
            }));
          } else if (event.type === "tool-status") {
            updateMessage(answerId, (message) => ({
              ...message,
              activity: event.command,
            }));
          } else if (event.type === "citations") {
            updateMessage(answerId, (message) => ({
              ...message,
              citations: event.citations,
            }));
          } else if (event.type === "error") {
            updateMessage(answerId, (message) => ({
              ...message,
              state: "error",
              activity: undefined,
              error: event.message,
            }));
          }
        },
      })
        .then((outcome) => {
          updateMessage(answerId, (message) => {
            if (message.state === "error") return message;
            if (outcome === "aborted") {
              return message.content
                ? { ...message, state: "complete", activity: undefined }
                : {
                    ...message,
                    state: "error",
                    activity: undefined,
                    error: "Answer stopped.",
                  };
            }
            return { ...message, state: "complete", activity: undefined };
          });
        })
        .catch((error: unknown) => {
          updateMessage(answerId, (message) => ({
            ...message,
            state: "error",
            activity: undefined,
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

  const stop = React.useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const retry = React.useCallback(() => {
    const lastQuestion = [...messagesRef.current]
      .reverse()
      .find((message) => message.role === "user")?.content;
    if (!lastQuestion || controllerRef.current) return;
    setMessages((current) => {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        if (current[index]?.role === "user") return current.slice(0, index);
      }
      return current;
    });
    ask(lastQuestion);
  }, [ask]);

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

async function streamAnswer(options: {
  endpoint: string;
  transcript: AssistantTranscriptMessage[];
  signal: AbortSignal;
  onEvent: (event: AssistantStreamEvent) => void;
}): Promise<"done" | "aborted"> {
  let response: Response;
  try {
    response = await fetch(options.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: options.transcript }),
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
        if (line) options.onEvent(JSON.parse(line) as AssistantStreamEvent);
        newlineIndex = buffer.indexOf("\n");
      }
    }
  } catch (error) {
    if (options.signal.aborted) return "aborted";
    throw error;
  }
  return "done";
}
