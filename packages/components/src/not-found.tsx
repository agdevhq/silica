import { Button } from "@silicajs/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@silicajs/ui/components/card";

export type NotFoundProps = {
  title?: string;
  description?: string;
  cta?: { href: string; label: string };
  className?: string;
};

export function NotFound({
  title = "Page not found",
  description = "The requested note does not exist or is not published.",
  cta = { href: "/", label: "Return home" },
  className,
}: NotFoundProps) {
  return (
    <main className={className} data-slot="not-found">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<a href={cta.href}>{cta.label}</a>} />
        </CardContent>
      </Card>
    </main>
  );
}
