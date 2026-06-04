import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@silicajs/ui/components/card";

export type SignInShellProps = {
  title: string;
  description?: string;
  logo?: string;
  headline?: string;
  subheadline?: string;
  children: ReactNode;
};

export function SignInShell({
  title,
  description,
  logo,
  headline = "Sign in required",
  subheadline,
  children,
}: SignInShellProps) {
  const hint =
    subheadline ??
    (description
      ? `${description} is private. Sign in with Google to access it.`
      : "This site is private. Sign in with Google to continue.");

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6 md:p-10"
      data-slot="sign-in"
    >
      <div className="flex items-center gap-2">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="size-8 shrink-0 rounded-md object-contain"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
        )}
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
      </div>

      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl tracking-tight">{headline}</CardTitle>
          <CardDescription>{hint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </main>
  );
}
