import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@silicajs/ui/components/card";

import { SilicaLink } from "./routing.js";
import { slugToHref } from "./slug.js";

export type BacklinkItem = {
  slug: string;
  title: string;
};

export type BacklinksProps = {
  backlinks: BacklinkItem[];
  className?: string;
};

export function Backlinks({ backlinks, className }: BacklinksProps) {
  if (backlinks.length === 0) return null;
  return (
    <Card size="sm" className={className} data-slot="backlinks">
      <CardHeader>
        <CardTitle>Backlinks</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5 text-sm">
          {backlinks.map((backlink) => (
            <li key={backlink.slug}>
              <SilicaLink
                href={slugToHref(backlink.slug)}
                className="text-primary hover:underline"
              >
                {backlink.title}
              </SilicaLink>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
