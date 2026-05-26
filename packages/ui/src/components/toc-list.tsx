import * as React from "react";

import { cn } from "@silicajs/ui/lib/utils";

export type TocListItem = {
  id: string;
  label: React.ReactNode;
  href: string;
  depth: number;
};

export type TocListProps = {
  items: TocListItem[];
  activeId?: string;
  className?: string;
};

export function TocList({ items, activeId, className }: TocListProps) {
  if (items.length === 0) return null;
  return (
    <ol data-slot="toc-list" className={cn("flex flex-col gap-1 text-sm", className)}>
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <li
            key={item.id}
            style={{ paddingInlineStart: `${item.depth * 0.75}rem` }}
          >
            <a
              href={item.href}
              className={cn(
                "block rounded-md px-2 py-1 transition-colors",
                isActive
                  ? "font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
