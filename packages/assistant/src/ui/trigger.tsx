"use client";

import * as React from "react";
import { Button } from "@silicajs/ui/components/button";
import { KeyboardShortcut } from "@silicajs/ui/components/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@silicajs/ui/components/tooltip";
import { SparklesIcon } from "lucide-react";
import { useAssistant } from "./provider.js";

export type AssistantTriggerProps = {
  className?: string;
  label?: string;
  iconOnly?: boolean;
};

export function AssistantTrigger({
  className,
  label = "Ask AI",
  iconOnly = false,
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

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => assistant.setOpen(true)}
              className={className}
            >
              <SparklesIcon className="text-muted-foreground" />
              <span className="sr-only">{label}</span>
            </Button>
          }
        />
        <TooltipContent side="right">
          <span>Open the assistant panel</span>
          <KeyboardShortcut keys="I" />
        </TooltipContent>
      </Tooltip>
    );
  }

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
      <KeyboardShortcut keys="I" inlineEnd />
    </Button>
  );
}
