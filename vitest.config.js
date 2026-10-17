import { defineConfig } from "vitest/config";
import managerSeasons from "./scripts/vite-manager-seasons.mjs";

export default defineConfig({
  // Match the application build: historical archives are data, not huge JS ASTs.
  json: { stringify: true },
  // Modo mánager season archives: full files, sliced on demand (see the plugin).
  plugins: [managerSeasons()],
  test: {
    environment: "node",
    include: ["src/**/*.test.js", "server/**/*.test.js"],
    reporters: "default"
  }
});
