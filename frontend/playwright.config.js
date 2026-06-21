// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e", // Path to your test files
  timeout: 20 * 1000, // Test timeout in milliseconds
  use: {
    headless: true, // Run tests in headless mode (required for CI / sandboxed environments)
    baseURL: "http://localhost:3000",
    viewport: { width: 1300, height: 720 }, // Default viewport
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev", // Vite dev server - faster to boot than build+preview for test runs
    port: 3000,
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
