import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "Silica Docs",
  description: "Documentation for the Silica framework",
  logo: "/favicon.svg",
  baseUrl: "http://localhost:3000",
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
    prerender: {
      strategy: "none",
      include: ["index", "writing/links"],
    },
  },
});
