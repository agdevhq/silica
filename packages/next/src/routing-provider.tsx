"use client";

import * as React from "react";
import Link from "next/link.js";
import { usePathname, useRouter } from "next/navigation.js";
import {
  SilicaRoutingProvider,
  type SilicaLinkProps,
  type SilicaLinkComponent,
} from "@silicajs/components/routing";

const NextSilicaLink: SilicaLinkComponent = React.forwardRef<
  HTMLAnchorElement,
  SilicaLinkProps
>(function NextSilicaLink(props, ref) {
  return <Link ref={ref} {...props} />;
});

export function SilicaNextRoutingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = React.useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  return (
    <SilicaRoutingProvider
      Link={NextSilicaLink}
      currentSlug={pathnameToSlug(pathname)}
      navigate={navigate}
    >
      {children}
    </SilicaRoutingProvider>
  );
}

function pathnameToSlug(pathname: string | null): string {
  if (!pathname || pathname === "/") return "index";
  return pathname.replace(/^\/+|\/+$/g, "") || "index";
}
