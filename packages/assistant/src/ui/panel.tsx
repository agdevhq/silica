"use client";

import * as React from "react";
import { Button } from "@silicajs/ui/components/button";
import { Textarea } from "@silicajs/ui/components/textarea";
import { cn } from "@silicajs/ui/lib/utils";
import {
  ArrowUpIcon,
  SparklesIcon,
  SquareIcon,
  SquarePenIcon,
  XIcon,
} from "lucide-react";
import { AssistantMessage } from "./message.js";
import { useAssistant } from "./provider.js";

export type AssistantPanelProps = {
  className?: string;
};

/**
 * The assistant chat window: header, conversation, and composer. Fills its
 * container; themes decide where and how to present it (docked sidebar,
 * overlay, …) and typically mount it only while the assistant is open.
 */
export function AssistantPanel({ className }: AssistantPanelProps) {
  const assistant = useAssistant();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const open = assistant?.open ?? false;

  const messageCount = assistant?.messages.length ?? 0;
  const lastMessage = assistant?.messages.at(-1);
  React.useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messageCount, lastMessage?.content, lastMessage?.state]);

  if (!assistant) return null;

  return (
    <aside
      aria-label="AI assistant"
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-background",
        className,
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 px-3">
        <SparklesIcon className="size-4 text-primary" />
        <span className="flex-1 text-sm font-semibold tracking-tight">
          Assistant
        </span>
        {assistant.messages.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={assistant.reset}
            title="New conversation"
          >
            <SquarePenIcon />
            <span className="sr-only">New conversation</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => assistant.setOpen(false)}
          title="Close assistant"
        >
          <XIcon />
          <span className="sr-only">Close assistant</span>
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {assistant.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <SparklesIcon className="size-6 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">Ask anything</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Answers come from this site&apos;s pages and include links to the
              sources used.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 py-4">
            {assistant.messages.map((message) => (
              <AssistantMessage
                key={message.id}
                message={message}
                onRetry={assistant.retry}
              />
            ))}
          </div>
        )}
      </div>

      <AssistantComposer
        isStreaming={assistant.isStreaming}
        onAsk={assistant.ask}
        onStop={assistant.stop}
        focusToken={open}
      />
    </aside>
  );
}

function AssistantComposer({
  isStreaming,
  onAsk,
  onStop,
  focusToken,
}: {
  isStreaming: boolean;
  onAsk: (question: string) => void;
  onStop: () => void;
  focusToken: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (focusToken) textareaRef.current?.focus();
  }, [focusToken]);

  const submit = () => {
    if (isStreaming || !draft.trim()) return;
    onAsk(draft);
    setDraft("");
  };

  return (
    <form
      className="shrink-0 px-3 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask a question…"
          rows={2}
          className="max-h-40 min-h-14 resize-none pr-11"
        />
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute bottom-1.5 right-1.5"
            onClick={onStop}
            title="Stop answering"
          >
            <SquareIcon />
            <span className="sr-only">Stop answering</span>
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-sm"
            className="absolute bottom-1.5 right-1.5"
            disabled={!draft.trim()}
            title="Send question"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send question</span>
          </Button>
        )}
      </div>
    </form>
  );
}
