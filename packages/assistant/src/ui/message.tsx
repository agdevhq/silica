"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SilicaLink } from "@silicajs/components";
import { cn } from "@silicajs/ui/lib/utils";
import { Button } from "@silicajs/ui/components/button";
import { FileTextIcon, LoaderCircleIcon } from "lucide-react";
import type { AssistantChatMessage } from "./provider.js";

export type AssistantMessageProps = {
  message: AssistantChatMessage;
  onRetry: () => void;
};

export function AssistantMessage({ message, onRetry }: AssistantMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-muted px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message.content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ a: MarkdownLink }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : null}
      {message.state === "streaming" ? (
        <AssistantActivity
          activity={message.activity}
          hasContent={Boolean(message.content)}
        />
      ) : null}
      {message.state === "error" ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive">
            {message.error ?? "Something went wrong."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {message.citations.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {message.citations.map((citation) => (
            <SilicaLink
              key={citation.slug}
              href={citation.href}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <FileTextIcon className="size-3 shrink-0" />
              <span className="truncate">{citation.title}</span>
            </SilicaLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AssistantActivity({
  activity,
  hasContent,
}: {
  activity?: string;
  hasContent: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        !hasContent && "py-1",
      )}
    >
      <LoaderCircleIcon className="size-3.5 animate-spin" />
      {activity ? (
        <span className="truncate">
          Searching pages… <code className="font-mono">{activity}</code>
        </span>
      ) : (
        <span>Thinking…</span>
      )}
    </div>
  );
}

function MarkdownLink({
  href = "",
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href.startsWith("/")) {
    return (
      <SilicaLink href={href} {...props}>
        {children}
      </SilicaLink>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}
