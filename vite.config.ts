import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), cloudflare()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-mui": ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
          "vendor-state": [
            "zustand",
            "@tanstack/react-query",
            "i18next",
            "react-i18next",
            "i18next-browser-languagedetector",
          ],
          "vendor-export": ["jszip", "file-saver"],
        },
      },
    },
  },
  base: (() => {
    if (process.env.VITE_BASE_PATH) {
      return process.env.VITE_BASE_PATH;
    }

    if (process.env.GITHUB_ACTIONS === "true") {
      const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
      return repo ? `/${repo}/` : "/";
    }

    return "/";
  })(),
});