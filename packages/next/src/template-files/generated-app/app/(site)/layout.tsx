import type { ReactNode } from "react";
import theme from "../../silica-theme";
import { getLayoutProps } from "@silicajs/next/routes/layout";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const props = await getLayoutProps();
  const SiteLayoutComponent = theme.SiteLayout ?? theme.Layout;
  return <SiteLayoutComponent {...props}>{children}</SiteLayoutComponent>;
}
