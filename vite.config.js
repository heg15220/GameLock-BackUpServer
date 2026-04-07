import { defineConfig } from "vite";

const allowedHosts = [
  "transcript-networks-trades-elect.trycloudflare.com",
];

export default defineConfig({
  server: {
    allowedHosts,
  },
  preview: {
    allowedHosts,
  },
});
