import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3010",
  },
  webServer: [
    {
      command:
        "PORT=3010 SILICA_PROJECT_ROOT=/workspace/examples/minimal-vault SILICA_AUTH_ENABLED=false npx next start /workspace/examples/minimal-vault/.silica/next",
      url: "http://localhost:3010",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        "PORT=3011 SILICA_PROJECT_ROOT=/workspace/examples/minimal-vault SILICA_AUTH_ENABLED=true npx next start /workspace/examples/minimal-vault/.silica/next",
      url: "http://localhost:3011/sign-in",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
