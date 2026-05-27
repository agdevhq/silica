"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@silicajs/ui/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@silicajs/ui/components/collapsible";
import { getPageProperties } from "@silicajs/core/runtime";

const STORAGE_KEY = "silica:page-properties:open";

export type PagePropertiesProps = {
  frontmatter: Record<string, unknown>;
  className?: string;
  defaultOpen?: boolean;
};

export function PageProperties({
  frontmatter,
  className,
  defaultOpen = false,
}: PagePropertiesProps) {
  const properties = getPageProperties(frontmatter);
  const [open, setOpen] = useState<boolean>(defaultOpen);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true" || stored === "false") {
        setOpen(stored === "true");
      }
    } catch {
      // ignore (private mode, disabled storage, etc.)
    }
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }

  if (properties.length === 0) return null;

  return (
    <Collapsible
      data-slot="page-properties"
      open={open}
      onOpenChange={handleOpenChange}
      className={cn(
        "rounded-lg border border-border bg-card text-sm",
        className,
      )}
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left font-medium">
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <span className="text-foreground">Page Properties</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {properties.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
        <dl className="border-t border-border">
          {properties.map((property) => (
            <div
              key={property.key}
              className="grid grid-cols-[10rem_1fr] gap-x-4 border-t border-border first:border-t-0"
            >
              <dt className="px-4 py-2 text-muted-foreground">
                {property.label}
              </dt>
              <dd className="px-4 py-2 text-foreground">{property.value}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
