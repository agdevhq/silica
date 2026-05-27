import type { HTMLAttributes } from "react";
import { cn } from "@silicajs/ui/lib/utils";
import { Code2 } from "lucide-react";

export type CodeBlockProps = HTMLAttributes<HTMLElement> & {
  "data-language"?: string;
  "data-language-label"?: string;
};

export function CodeBlock({
  children,
  className,
  "data-language": language,
  "data-language-label": languageLabel,
  ...props
}: CodeBlockProps) {
  return (
    <figure
      {...props}
      data-slot="code-block"
      data-language={language}
      className={cn(
        "p-2 my-6 overflow-hidden rounded-lg bg-(--tw-prose-pre-bg)",
        "[&>pre]:m-0 [&>pre]:rounded-none [&>pre]:border-0 [&>pre]:shadow-none",
        className,
      )}
    >
      {languageLabel ? (
        <figcaption
          data-slot="code-block-header"
          className="flex items-center justify-between px-3.5 pt-3.5 mt-0 text-xs leading-none tracking-wide text-muted-foreground"
        >
          <span
            data-slot="code-block-language"
            className="inline-flex items-center gap-1.5"
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            {languageLabel}
          </span>
        </figcaption>
      ) : null}
      {children}
    </figure>
  );
}
