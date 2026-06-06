import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "Silica Docs",
  description: "Documentation for the Silica framework",
  logo: "/favicon.svg",
  baseUrl: "http://localhost:3000",
  contentDir: process.env.SILICA_CONTENT_DIR ?? "content",
  theme: "default",
  wikilinks: {
    strategy: "shortest",
    strict: false,
  },
});
