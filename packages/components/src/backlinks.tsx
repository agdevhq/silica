import type { Graph, Manifest } from "@silicajs/core/runtime";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@silicajs/ui/components/card";

import { slugToHref } from "./slug.js";

export type BacklinksProps = {
  graph: Graph;
  slug: string;
  manifest: Manifest;
  className?: string;
};

export function Backlinks({ graph, slug, manifest, className }: BacklinksProps) {
  const backlinks = graph.backlinks[slug] ?? [];
  if (backlinks.length === 0) return null;
  return (
    <Card size="sm" className={className} data-slot="backlinks">
      <CardHeader>
        <CardTitle>Backlinks</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5 text-sm">
          {backlinks.map((source) => {
            const entry = manifest.bySlug[source];
            return (
              <li key={source}>
                <a
                  href={slugToHref(source)}
                  className="text-primary hover:underline"
                >
                  {entry?.title ?? source}
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
