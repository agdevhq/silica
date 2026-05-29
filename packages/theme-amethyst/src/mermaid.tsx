import type { HTMLAttributes } from "react";
import { cn } from "@silicajs/ui/lib/utils";

export type MermaidProps = HTMLAttributes<HTMLElement> & {
  "data-source"?: string;
};

export function Mermaid({
  children,
  className,
  "data-source": source,
  ...props
}: MermaidProps) {
  return (
    <figure
      {...props}
      data-slot="mermaid"
      data-source={source}
      className={cn(
        "my-6 overflow-hidden rounded-lg border bg-muted/30",
        className,
      )}
    >
      <pre className="m-0 overflow-x-auto p-4 text-sm">
        {source || children}
      </pre>
    </figure>
  );
}
