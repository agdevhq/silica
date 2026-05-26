import { Button } from "@silicajs/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@silicajs/ui/components/card";

export type NotAllowedProps = {
  title?: string;
  description?: string;
  cta?: { href: string; label: string };
  className?: string;
};

export function NotAllowed({
  title = "Not allowed",
  description = "Your email is not on this site's allowlist.",
  cta = { href: "/sign-in", label: "Try a different account" },
  className,
}: NotAllowedProps) {
  return (
    <main className={className} data-slot="not-allowed">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<a href={cta.href}>{cta.label}</a>} />
        </CardContent>
      </Card>
    </main>
  );
}
