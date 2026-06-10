"use client";

import * as React from "react";
import { Button } from "@silicajs/ui/components/button";
import { SparklesIcon } from "lucide-react";
import { useAssistant } from "./provider.js";

export type AssistantTriggerProps = {
  className?: string;
  label?: string;
};

export function AssistantTrigger({
  className,
  label = "Ask AI",
}: AssistantTriggerProps) {
  const assistant = useAssistant();

  React.useEffect(() => {
    if (!assistant) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        assistant.setOpen(!assistant.open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [assistant]);

  if (!assistant) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => assistant.setOpen(true)}
      className={className}
    >
      <SparklesIcon
        data-icon="inline-start"
        className="text-muted-foreground"
      />
      <span className="flex-1 text-left text-muted-foreground">{label}</span>
      <kbd
        data-icon="inline-end"
        className="pointer-events-none ml-2 inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
      >
        <span className="text-xs">⌘</span>I
      </kbd>
    </Button>
  );
}
