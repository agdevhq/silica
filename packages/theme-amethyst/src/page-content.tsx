"use client";

import type { ReactNode } from "react";
import { useSilicaAssistant } from "@silicajs/components";
import { cn } from "@silicajs/ui/lib/utils";

export type PageContentLayoutProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

/**
 * Two-column page scaffold: the article alongside a sticky content sidebar
 * (tags, table of contents). The sidebar normally appears from `lg` up, but
 * while the assistant pane is docked that breakpoint leaves too little room
 * for both, so it is deferred to `2xl`.
 */
export function PageContentLayout({
  children,
  sidebar,
}: PageContentLayoutProps) {
  const assistantOpen = useSilicaAssistant()?.open ?? false;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-8 py-12",
        assistantOpen
          ? "2xl:grid 2xl:grid-cols-[minmax(0,1fr)_14rem] 2xl:gap-12"
          : "lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12",
      )}
    >
      {children}
      <aside
        className={cn(
          "mt-12 hidden flex-col gap-8",
          assistantOpen
            ? "2xl:sticky 2xl:top-12 2xl:mt-0 2xl:flex 2xl:self-start"
            : "lg:sticky lg:top-12 lg:mt-0 lg:flex lg:self-start",
        )}
      >
        {sidebar}
      </aside>
    </div>
  );
}
