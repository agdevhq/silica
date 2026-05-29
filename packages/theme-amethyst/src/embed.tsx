import type { HTMLAttributes } from "react";
import { cn } from "@silicajs/ui/lib/utils";

export type EmbedProps = HTMLAttributes<HTMLElement> & {
  "data-embed-kind"?: string;
  "data-embed-target"?: string;
  src?: string;
};

export function Embed({
  children,
  className,
  "data-embed-kind": kind,
  "data-embed-target": target,
  src,
  ...props
}: EmbedProps) {
  return (
    <figure
      {...props}
      data-slot="embed"
      data-embed-kind={kind}
      data-embed-target={target}
      className={cn(
        "my-6 overflow-hidden rounded-lg border bg-muted/30",
        className,
      )}
    >
      {src && kind === "pdf" ? (
        <object data={src} type="application/pdf" className="h-96 w-full">
          {children}
        </object>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">{children}</div>
      )}
    </figure>
  );
}
