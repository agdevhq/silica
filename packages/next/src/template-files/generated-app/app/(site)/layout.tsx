import type { ReactNode } from "react";
import theme from "../../silica-theme";
import { assistant } from "../../silica-assistant";
import { getLayoutProps } from "@silicajs/next/routes/layout";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const props = await getLayoutProps();
  return (
    <theme.SiteLayout {...props} assistant={assistant}>
      {children}
    </theme.SiteLayout>
  );
}
