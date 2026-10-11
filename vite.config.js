import { defineConfig } from "vite";

const allowedHosts = [
  "transcript-networks-trades-elect.trycloudflare.com",
];

export default defineConfig({
  // Large historical archives use default JSON imports. Parsing compact data
  // avoids expanding every record into JS syntax during bundling/minification.
  json: { stringify: true },
  server: {
    allowedHosts,
    // Archive download caches and QA artefacts are not application modules.
    // Ignoring them also avoids Windows watcher races during parallel imports.
    watch: { ignored: ['**/.cache/**', '**/output/**'] },
  },
  preview: {
    allowedHosts,
  },
});
