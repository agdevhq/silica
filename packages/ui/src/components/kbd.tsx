"use client";

import { useModKeyLabel } from "@silicajs/ui/hooks/use-mod-key-label";
import { cn } from "@silicajs/ui/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

type KeyboardShortcutProps = Omit<
  React.ComponentProps<typeof Kbd>,
  "children"
> & {
  /** Single key label, e.g. `"K"` or `"I"`. */
  keys: string;
  /** Align as trailing icon inside a button. */
  inlineEnd?: boolean;
};

function KeyboardShortcut({
  keys,
  inlineEnd = false,
  className,
  ...props
}: KeyboardShortcutProps) {
  const modKeyLabel = useModKeyLabel();

  if (modKeyLabel === null) {
    return null;
  }

  return (
    <Kbd
      data-icon={inlineEnd ? "inline-end" : undefined}
      className={cn(
        "gap-1 px-1.5 font-mono text-[10px]",
        inlineEnd && "ml-2",
        className,
      )}
      {...props}
    >
      {modKeyLabel === "⌘" ? (
        <>
          <span className="text-xs">{modKeyLabel}</span>
          {keys.toUpperCase()}
        </>
      ) : (
        <>
          <span>{modKeyLabel}</span>
          <span>+</span>
          {keys.toUpperCase()}
        </>
      )}
    </Kbd>
  );
}

export { Kbd, KbdGroup, KeyboardShortcut, type KeyboardShortcutProps };
