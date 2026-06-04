import type { ReactNode } from "react";
import theme from "../../silica-theme";
import { getLayoutProps } from "@silicajs/next/routes/layout";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const props = await getLayoutProps();
  return <theme.SiteLayout {...props}>{children}</theme.SiteLayout>;
}
