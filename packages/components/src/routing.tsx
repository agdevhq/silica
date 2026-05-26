"use client";

import * as React from "react";

export type SilicaLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export type SilicaLinkComponent = React.ForwardRefExoticComponent<
  SilicaLinkProps & React.RefAttributes<HTMLAnchorElement>
>;

export type SilicaRoutingContextValue = {
  Link: SilicaLinkComponent;
  currentSlug?: string;
  navigate: (href: string) => void;
};

const DefaultLink = React.forwardRef<HTMLAnchorElement, SilicaLinkProps>(
  function DefaultLink({ href, ...props }, ref) {
    return <a ref={ref} href={href} {...props} />;
  },
);

const defaultRouting: SilicaRoutingContextValue = {
  Link: DefaultLink,
  navigate: (href) => {
    window.location.href = href;
  },
};

const SilicaRoutingContext =
  React.createContext<SilicaRoutingContextValue>(defaultRouting);

export type SilicaRoutingProviderProps = Partial<SilicaRoutingContextValue> & {
  children: React.ReactNode;
};

export function SilicaRoutingProvider({
  children,
  Link = DefaultLink,
  currentSlug,
  navigate = defaultRouting.navigate,
}: SilicaRoutingProviderProps) {
  const value = React.useMemo(
    () => ({ Link, currentSlug, navigate }),
    [Link, currentSlug, navigate],
  );

  return (
    <SilicaRoutingContext.Provider value={value}>
      {children}
    </SilicaRoutingContext.Provider>
  );
}

export function useSilicaRouting(): SilicaRoutingContextValue {
  return React.useContext(SilicaRoutingContext);
}

export const SilicaLink = React.forwardRef<HTMLAnchorElement, SilicaLinkProps>(
  function SilicaLink(props, ref) {
    const { Link } = useSilicaRouting();
    return <Link ref={ref} {...props} />;
  },
);
