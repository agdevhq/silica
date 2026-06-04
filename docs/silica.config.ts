import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "Silica Docs",
  description: "Documentation for the Silica framework",
  logo: "/favicon.svg",
  baseUrl: "http://localhost:3000",
  theme: "default",
  wikilinks: {
    strategy: "shortest",
    strict: false,
  },
  auth: {
    provider: "google",
    allowedDomains: ["omnifact.ai"],
  },
});
