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
import { prettySegment } from "./slug.js";

export type BreadcrumbsProps = {
  slug: string;
  className?: string;
};

export function Breadcrumbs({ slug, className }: BreadcrumbsProps) {
  const segments = slug === "index" ? [] : slug.split("/");
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
        {segments.map((segment, index) => {
          acc = acc ? `${acc}/${segment}` : segment;
          const isLast = index === segments.length - 1;
          const label = prettySegment(segment);
          return (
            <React.Fragment key={acc}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<SilicaLink href={`/${acc}`}>{label}</SilicaLink>}
                  />
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
