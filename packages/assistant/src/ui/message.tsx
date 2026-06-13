"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SilicaLink } from "@silicajs/components";
import { cn } from "@silicajs/ui/lib/utils";
import { Button } from "@silicajs/ui/components/button";
import {
  ChevronDownIcon,
  FileTextIcon,
  LoaderCircleIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import type { AssistantChatMessage } from "./provider.js";

export type AssistantMessageProps = {
  message: AssistantChatMessage;
  onRetry: () => void;
};

export function AssistantMessage({ message, onRetry }: AssistantMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex min-w-0 justify-end">
        <div className="min-w-0 max-w-[85%] rounded-xl rounded-br-sm bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 overflow-hidden">
      {message.commands.length > 0 ||
      (message.state === "streaming" && !message.content) ? (
        <AssistantActivity
          commands={message.commands}
          searching={message.state === "streaming" && !message.content}
        />
      ) : null}
      {message.content ? (
        <div className="prose prose-sm dark:prose-invert min-w-0 max-w-none break-words text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ a: MarkdownLink }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
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
  commands,
  searching,
}: {
  commands: string[];
  /** True only while still gathering pages (before the answer streams). */
  searching: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);

  // Searching has begun but no command has run yet: a plain progress line.
  // Keep the row markup identical to the toggle below so swapping between the
  // two states does not shift anything vertically.
  if (commands.length === 0) {
    return (
      <div className="flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden text-xs text-muted-foreground">
        <div className="flex items-center gap-2 self-start">
          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" />
          <span>Thinking…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="group flex items-center gap-2 self-start rounded-md text-left transition-colors hover:text-foreground"
      >
        {searching ? (
          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <SearchIcon className="size-3.5 shrink-0" />
        )}
        <span>{searching ? "Searching the site…" : "Searched the site"}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <ul className="flex min-w-0 max-w-full flex-col gap-1 overflow-hidden pl-[1.375rem]">
          {commands.map((command, index) => (
            <li
              key={`${index}-${command}`}
              className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden"
            >
              <TerminalIcon className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 overflow-hidden">
                <code className="block truncate font-mono">{command}</code>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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
