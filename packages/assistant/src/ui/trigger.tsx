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
  onOpen?: () => void;
};

export function AssistantTrigger({
  className,
  label = "Ask AI",
  iconOnly = false,
  onOpen,
}: AssistantTriggerProps) {
  const assistant = useAssistant();
  const setOpen = assistant?.setOpen;

  const openAssistant = React.useCallback(() => {
    onOpen?.();
    assistant?.setOpen(true);
  }, [assistant, onOpen]);

  React.useEffect(() => {
    if (!setOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        setOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

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
              onClick={openAssistant}
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
      onClick={openAssistant}
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const editable = target.closest("input, textarea, select, [contenteditable]");
  if (!editable) return false;
  return editable.getAttribute("contenteditable") !== "false";
}
