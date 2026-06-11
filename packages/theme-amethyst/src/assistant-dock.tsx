"use client";

import type { ReactNode } from "react";
import { useSilicaAssistant } from "@silicajs/components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@silicajs/ui/components/resizable";
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
  const open = useSilicaAssistant()?.open ?? false;
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {children}
        {open ? (
          <div className="fixed inset-y-0 right-0 z-40 w-full shadow-xl">
            {panel}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <ResizablePanelGroup
      className="min-h-svh flex-1"
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
            <div className="sticky top-0 h-svh">{panel}</div>
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  );
}
