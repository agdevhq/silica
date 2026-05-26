import "katex/dist/katex.min.css";
import type { ReactNode } from "react";
import theme from "../silica-theme";
import { getLayoutProps } from "@silicajs/next/routes/layout";
export { generateMetadata } from "@silicajs/next/routes/layout";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const props = await getLayoutProps();
  return <theme.Layout {...props}>{children}</theme.Layout>;
}
