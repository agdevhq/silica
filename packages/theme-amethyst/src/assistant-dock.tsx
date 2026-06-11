"use client";

import type { ReactNode } from "react";
import { useSilicaAssistant } from "@silicajs/components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@silicajs/ui/components/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@silicajs/ui/components/sheet";
import { useIsMobile } from "@silicajs/ui/hooks/use-mobile";

export type AssistantDockProps = {
  /** The assistant chat window handed to the theme by the framework. */
  panel: ReactNode;
  children: ReactNode;
};

/**
 * Docks the assistant chat window as a persistent, resizable sidebar to the
 * right of the page content; on small screens it covers the viewport
 * instead. The page keeps regular document scrolling and only the chat
 * column is pinned, which is why the resizable group and panels override
 * the library's height/overflow defaults (it assumes a fixed-height shell).
 */
export function AssistantDock({ panel, children }: AssistantDockProps) {
  const assistant = useSilicaAssistant();
  const open = assistant?.open ?? false;
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {children}
        <Sheet
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) assistant?.closeAssistant?.();
          }}
        >
          <SheetContent
            side="right"
            showCloseButton={false}
            className="inset-0 h-dvh w-full max-w-none border-0 p-0 sm:max-w-none"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>AI assistant</SheetTitle>
              <SheetDescription>
                Ask questions about this Silica site.
              </SheetDescription>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <ResizablePanelGroup
      className="min-h-svh min-w-0 flex-1"
      style={{ height: "auto", overflow: "visible" }}
    >
      <ResizablePanel
        id="content"
        className="flex flex-col"
        style={{ maxHeight: "none", overflow: "visible" }}
      >
        {children}
      </ResizablePanel>
      {open ? (
        <>
          <ResizableHandle />
          <ResizablePanel
            id="assistant"
            defaultSize="24rem"
            minSize="18rem"
            maxSize="50%"
            groupResizeBehavior="preserve-pixel-size"
            style={{ maxHeight: "none", overflow: "visible" }}
          >
            <div className="sticky top-0 h-svh min-w-0">{panel}</div>
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  );
}
