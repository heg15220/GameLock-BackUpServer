import { defineConfig } from "vite";
import managerSeasons from "./scripts/vite-manager-seasons.mjs";

const allowedHosts = [
  "transcript-networks-trades-elect.trycloudflare.com",
];

export default defineConfig({
  // Large historical archives use default JSON imports. Parsing compact data
  // avoids expanding every record into JS syntax during bundling/minification.
  json: { stringify: true },
  // Modo mánager: the season-keyed archives become one lazy chunk per season.
  plugins: [managerSeasons()],
  server: {
    allowedHosts,
    // Archive download caches and QA artefacts are not application modules.
    // Ignoring them also avoids Windows watcher races during parallel imports.
    watch: { ignored: ['**/.cache/**', '**/output/**'] },
    // Modo mánager cloud codes: `node server/manager-saves/index.mjs` in development.
    proxy: { '/api/manager-saves': 'http://127.0.0.1:8794' },
  },
  preview: {
    allowedHosts,
  },
});
