import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@silicajs/ui/components/breadcrumb";

import { SilicaLink } from "./routing.js";
import { breadcrumbSegmentHref, prettySegment } from "./slug.js";

export type BreadcrumbsProps = {
  slug: string;
  allSlugs: readonly string[];
  className?: string;
};

export function Breadcrumbs({ slug, allSlugs, className }: BreadcrumbsProps) {
  const segments = slug === "index" ? [] : slug.split("/").slice(0, -1);
  let acc = "";
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          {segments.length === 0 ? (
            <BreadcrumbPage>Home</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<SilicaLink href="/">Home</SilicaLink>} />
          )}
        </BreadcrumbItem>
        {segments.map((segment) => {
          acc = acc ? `${acc}/${segment}` : segment;
          const label = prettySegment(segment);
          const href = breadcrumbSegmentHref(acc, allSlugs);
          return (
            <React.Fragment key={acc}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {href ? (
                  <BreadcrumbLink
                    render={<SilicaLink href={href}>{label}</SilicaLink>}
                  />
                ) : (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
