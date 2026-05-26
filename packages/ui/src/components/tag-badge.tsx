import * as React from "react";

import { cn } from "@silicajs/ui/lib/utils";
import { Badge } from "@silicajs/ui/components/badge";

export type TagBadgeProps = {
  tag: string;
  href: string;
  className?: string;
};

export function TagBadge({ tag, href, className }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("hover:border-primary/40", className)}
      render={
        <a
          href={href}
          className="cursor-pointer text-foreground/80 no-underline transition-colors hover:text-foreground"
        />
      }
    >
      <span aria-hidden="true" className="text-muted-foreground">#</span>
      <span>{tag}</span>
    </Badge>
  );
}
