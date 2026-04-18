import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  globalSetup: "./global-setup.ts",
  webServer: undefined, // Services started via Docker Compose manually or locally
});
