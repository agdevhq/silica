import { defineConfig } from "@silicajs/core";

export default defineConfig({
  title: "Minimal Silica Vault",
  description: "Dogfood fixture for Silica",
  baseUrl: "http://localhost:3000",
  theme: "default",
  wikilinks: {
    strategy: "shortest",
    strict: false,
  },
});
