import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BENCH_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: ".",
  testMatch: /bench\.spec\.js$/,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: [
        "--enable-precise-memory-info",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
      ],
    },
  },
  projects: [
    {
      name: "chrome-bench",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
