import { defineConfig } from "vitest/config";

export default defineConfig({
  // Match the application build: historical archives are data, not huge JS ASTs.
  json: { stringify: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.js", "server/**/*.test.js"],
    reporters: "default"
  }
});
