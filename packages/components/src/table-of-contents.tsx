import * as React from "react";
import type { TocItem } from "@silicajs/core/runtime";

import { TocList, type TocListItem } from "@silicajs/ui/components/toc-list";

export type TableOfContentsProps = {
  toc: TocItem[];
  activeId?: string;
  heading?: React.ReactNode;
  className?: string;
};

export function TableOfContents({
  toc,
  activeId,
  heading = "On this page",
  className,
}: TableOfContentsProps) {
  if (toc.length === 0) return null;

  const minDepth = Math.min(...toc.map((item) => item.depth));
  const items: TocListItem[] = toc.map((item) => ({
    id: item.id,
    label: item.text,
    href: `#${item.id}`,
    depth: Math.max(0, item.depth - minDepth),
  }));

  return (
    <nav aria-label="Table of contents" className={className}>
      {heading ? (
        <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {heading}
        </p>
      ) : null}
      <TocList items={items} activeId={activeId} />
    </nav>
  );
}
