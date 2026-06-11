"use client";

import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@silicajs/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@silicajs/ui/components/dialog";
import { Button } from "@silicajs/ui/components/button";
import { KeyboardShortcut } from "@silicajs/ui/components/kbd";
import { SearchIcon, SparklesIcon } from "lucide-react";

import { useSilicaAssistant } from "./assistant-context.js";
import { useSilicaRouting } from "./routing.js";
import { slugToHref } from "./slug.js";

type SearchHighlightPart = {
  text: string;
  highlighted: boolean;
};

type SearchResult = {
  slug: string;
  title: string;
  titleParts: SearchHighlightPart[];
  excerptParts: SearchHighlightPart[];
};

export type SearchTriggerProps = {
  placeholder?: string;
  className?: string;
};

export function SearchTrigger({
  placeholder = "Search…",
  className,
}: SearchTriggerProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <SearchIcon
          data-icon="inline-start"
          className="text-muted-foreground"
        />
        <span className="flex-1 text-left text-muted-foreground">
          {placeholder}
        </span>
        <KeyboardShortcut keys="K" inlineEnd />
      </Button>
      <SearchPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

export type SearchPaletteProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
};

export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  const { navigate } = useSilicaRouting();
  const assistant = useSilicaAssistant();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setIsLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    const controller = new AbortController();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return () => controller.abort();
    }

    setIsLoading(true);
    const timeout = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((payload: { results?: SearchResult[] }) => {
          setResults(payload.results ?? []);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          setResults([]);
        })
        .finally(() => setIsLoading(false));
    }, 120);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search</DialogTitle>
        <DialogDescription>Search your vault.</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="top-[12vh] translate-y-0 overflow-hidden rounded-xl! p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder="Type to search…"
            value={query}
            onValueChange={setQuery}
          />
          {query.trim() ? (
            <CommandList>
              {assistant ? (
                <CommandItem
                  value={`silica-assistant-handoff ${query}`}
                  onSelect={() => {
                    assistant.openAssistant(query.trim());
                    close();
                  }}
                >
                  <SparklesIcon className="shrink-0 text-primary" />
                  <span className="min-w-0 truncate text-sm">
                    Ask AI assistant:{" "}
                    <span className="font-medium text-foreground">
                      {query.trim()}
                    </span>
                  </span>
                </CommandItem>
              ) : null}
              {isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Searching…
                </div>
              ) : null}
              {!isLoading && results.length === 0 ? (
                assistant ? (
                  <div className="px-4 pt-2 pb-4 text-center text-sm text-muted-foreground">
                    No matching pages
                  </div>
                ) : (
                  <CommandEmpty>No results found</CommandEmpty>
                )
              ) : null}
              {results.map((result) => (
                <CommandItem
                  key={result.slug}
                  value={`${result.title} ${result.slug}`}
                  onSelect={() => {
                    navigate(slugToHref(result.slug));
                    close();
                  }}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-foreground">
                      <HighlightedText parts={result.titleParts} />
                    </span>
                    {result.excerptParts.length > 0 ? (
                      <span className="truncate text-xs leading-relaxed text-muted-foreground">
                        <HighlightedText parts={result.excerptParts} />
                      </span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          ) : null}
          {results.length > 0 ? (
            <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans">
                  ↵
                </kbd>
                to select
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans">
                  ↑
                </kbd>
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans">
                  ↓
                </kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex h-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-sans">
                  esc
                </kbd>
                to close
              </span>
            </div>
          ) : null}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function HighlightedText({ parts }: { parts: SearchHighlightPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.highlighted ? (
          <mark
            key={index}
            className="bg-transparent p-0 font-medium text-primary"
          >
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        ),
      )}
    </>
  );
}
