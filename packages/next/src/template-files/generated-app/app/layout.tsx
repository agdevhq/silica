import "katex/dist/katex.min.css";
import "@silicajs/theme-amethyst/styles.css";
import type { ReactNode } from "react";
import { SilicaDevReload } from "@silicajs/next/dev-reload-client";
import theme from "../silica-theme";
import { getLayoutProps } from "@silicajs/next/routes/layout";
import { SilicaNextRoutingProvider } from "@silicajs/next/routing-provider";
export { generateMetadata } from "@silicajs/next/routes/layout";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { config } = await getLayoutProps();
  return (
    <theme.RootLayout config={config} Provider={SilicaNextRoutingProvider}>
      <SilicaDevReload />
      {children}
    </theme.RootLayout>
  );
}
