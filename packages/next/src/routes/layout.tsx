import type React from "react";
import { loadManifest, loadResolvedConfig } from "../server-data.js";
import { resolveTheme } from "../theme.js";

export async function generateMetadata() {
  const config = await loadResolvedConfig();
  return {
    title: {
      default: config.title,
      template: `%s · ${config.title}`,
    },
    description: config.description,
  };
}

export type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const [manifest, config] = await Promise.all([loadManifest(), loadResolvedConfig()]);
  const theme = await resolveTheme(config);
  return <theme.Layout manifest={manifest} config={config} children={children} />;
}
