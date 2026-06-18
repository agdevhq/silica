import { defineConfig } from "@silicajs/core";

const siteUrl = process.env.SILICA_SITE_URL || "http://localhost:3000";

export default defineConfig({
  title: "Silica Docs",
  description: "Documentation for the Silica framework",
  logo: "/favicon.svg",
  baseUrl: siteUrl,
  contentDir: process.env.SILICA_CONTENT_DIR ?? "content",
  theme: "default",
  assistant: {
    provider: "azure-openai",
    model: "gpt-5-mini",
  },
  wikilinks: {
    strategy: "shortest",
    strict: false,
  },
  render: {
    cache: {
      // Let the deployment adapter manage Next route/data caches.
      storage: "memory",
    },
    prerender: {
      strategy: "none",
      include: ["index", "writing/links"],
    },
  },
});
