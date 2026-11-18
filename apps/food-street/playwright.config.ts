import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig({
  testDir: "./tests", fullyParallel: false, workers: 1, reporter: "list",
  timeout: 60000, expect: { timeout: 30000 },
  outputDir: fileURLToPath(new URL("../../.codex/test-results/browser", import.meta.url)),
  use: { viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  projects: [
    { name: "root", use: { baseURL: "http://127.0.0.1:5312/" } },
    { name: "nested", use: { baseURL: "http://127.0.0.1:5313/event/demo/" } },
  ],
  webServer: [
    { command: `"${process.execPath}" scripts/serve.mjs --port 5312`, cwd: root, url: "http://127.0.0.1:5312/", reuseExistingServer: !process.env.CI },
    { command: `"${process.execPath}" scripts/serve.mjs --port 5313 --mount /event/demo`, cwd: root, url: "http://127.0.0.1:5313/event/demo/", reuseExistingServer: !process.env.CI },
  ],
});
