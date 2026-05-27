import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@silicajs/ui/lib/utils";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Flame,
  Info,
  List,
  Pencil,
  Quote,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

const calloutVariants = cva(
  "silica-callout my-5 rounded-lg border px-4 py-3 text-foreground",
  {
    variants: {
      intent: {
        abstract: "border-teal-500/40 bg-teal-500/10",
        danger: "border-red-500/40 bg-red-500/10",
        question: "border-yellow-500/40 bg-yellow-500/10",
        muted: "border-muted-foreground/40 bg-muted/70",
        primary: "border-primary/40 bg-primary/10",
        success: "border-green-500/40 bg-green-500/10",
        tip: "border-sky-500/40 bg-sky-500/10",
        warning: "border-orange-500/40 bg-orange-500/10",
      },
    },
    defaultVariants: {
      intent: "muted",
    },
  },
);

const calloutTitleVariants = cva(
  "flex items-center gap-2 text-sm font-semibold leading-6",
  {
    variants: {
      intent: {
        abstract: "text-teal-700 dark:text-teal-300",
        danger: "text-red-700 dark:text-red-300",
        question: "text-yellow-700 dark:text-yellow-300",
        muted: "text-muted-foreground",
        primary: "text-primary",
        success: "text-green-700 dark:text-green-300",
        tip: "text-sky-700 dark:text-sky-300",
        warning: "text-orange-700 dark:text-orange-300",
      },
    },
    defaultVariants: {
      intent: "muted",
    },
  },
);

type CalloutIntent = NonNullable<
  VariantProps<typeof calloutVariants>["intent"]
>;

type CalloutDefinition = {
  icon: LucideIcon;
  intent: CalloutIntent;
};

const DEFAULT_CALLOUT: CalloutDefinition = {
  icon: Pencil,
  intent: "primary",
};

const CALLOUT_TYPES: Record<string, CalloutDefinition> = {
  abstract: { icon: ClipboardList, intent: "abstract" },
  attention: { icon: AlertTriangle, intent: "warning" },
  bug: { icon: Bug, intent: "danger" },
  caution: { icon: AlertTriangle, intent: "warning" },
  check: { icon: CheckCircle2, intent: "success" },
  cite: { icon: Quote, intent: "muted" },
  danger: { icon: Zap, intent: "danger" },
  done: { icon: CheckCircle2, intent: "success" },
  error: { icon: Zap, intent: "danger" },
  example: { icon: List, intent: "muted" },
  fail: { icon: XCircle, intent: "danger" },
  failure: { icon: XCircle, intent: "danger" },
  faq: { icon: CircleHelp, intent: "question" },
  help: { icon: CircleHelp, intent: "question" },
  hint: { icon: Flame, intent: "tip" },
  important: { icon: Flame, intent: "tip" },
  info: { icon: Info, intent: "primary" },
  missing: { icon: XCircle, intent: "danger" },
  note: DEFAULT_CALLOUT,
  question: { icon: CircleHelp, intent: "question" },
  quote: { icon: Quote, intent: "muted" },
  success: { icon: CheckCircle2, intent: "success" },
  summary: { icon: ClipboardList, intent: "abstract" },
  tip: { icon: Flame, intent: "tip" },
  tldr: { icon: ClipboardList, intent: "abstract" },
  todo: { icon: CheckCircle2, intent: "primary" },
  warning: { icon: AlertTriangle, intent: "warning" },
};

export type CalloutProps = HTMLAttributes<HTMLElement> & {
  "data-callout"?: string;
  "data-callout-title"?: string;
  "data-callout-foldable"?: string;
  "data-callout-open"?: string;
};

export function Callout({
  children,
  className,
  "data-callout": callout = "muted",
  "data-callout-title": title,
  "data-callout-foldable": foldable,
  "data-callout-open": open,
  ...props
}: CalloutProps) {
  const type = callout.toLowerCase();
  const { icon: Icon, intent } = CALLOUT_TYPES[type] ?? DEFAULT_CALLOUT;
  const heading = (
    <>
      <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
      <span>{title || titleCase(type)}</span>
    </>
  );

  if (foldable === "true") {
    return (
      <details
        {...props}
        data-slot="callout"
        className={cn("group/callout", calloutVariants({ intent }), className)}
        data-callout={type}
        open={open !== "false" ? true : undefined}
      >
        <summary
          data-slot="callout-title"
          className={cn(
            calloutTitleVariants({ intent }),
            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          )}
        >
          {heading}
          <ChevronRight
            className="ml-auto h-4 w-4 transition-transform group-open/callout:rotate-90"
            aria-hidden="true"
          />
        </summary>
        <CalloutContent>{children}</CalloutContent>
      </details>
    );
  }

  return (
    <aside
      {...props}
      data-slot="callout"
      className={cn(calloutVariants({ intent }), className)}
      data-callout={type}
    >
      <div
        data-slot="callout-title"
        className={calloutTitleVariants({ intent })}
      >
        {heading}
      </div>
      <CalloutContent>{children}</CalloutContent>
    </aside>
  );
}

function CalloutContent({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="callout-content"
      className="mt-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0"
    >
      {children}
    </div>
  );
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}
