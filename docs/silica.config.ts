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
    provider: "openai",
    model: "gpt-5.4-mini",
  },
  wikilinks: {
    strategy: "shortest",
    strict: false,
  },
  render: {
    prerender: "all",
  },
});
