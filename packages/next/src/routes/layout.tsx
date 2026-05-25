import type React from "react";
import { cacheLife } from "next/cache";
import { loadManifest, loadResolvedConfig } from "../server-data.js";
import { resolveTheme } from "../theme.js";

export async function generateMetadata() {
  const { config } = await getLayoutData();
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
  const { manifest, config } = await getLayoutData();
  const theme = await resolveTheme(config);
  return <theme.Layout manifest={manifest} config={config} children={children} />;
}

async function getLayoutData() {
  "use cache";
  cacheLife("max");
  const [manifest, config] = await Promise.all([loadManifest(), loadResolvedConfig()]);
  return { manifest, config };
}
