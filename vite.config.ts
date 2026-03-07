import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const imageProxyPlugin = {
  name: "dev-image-proxy",
  configureServer(server: {
    middlewares: {
      use: (
        path: string,
        handler: (
          req: { url?: string },
          res: {
            statusCode: number;
            setHeader: (name: string, value: string) => void;
            end: (data?: Buffer | string) => void;
          },
        ) => Promise<void> | void,
      ) => void;
    };
  }) {
    server.middlewares.use("/api/image-proxy", async (req, res) => {
      try {
        const parsed = new URL(req.url ?? "", "http://localhost");
        const remoteUrl = parsed.searchParams.get("url");
        if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) {
          res.statusCode = 400;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Missing or invalid url query parameter");
          return;
        }

        const upstream = await fetch(remoteUrl, {
          method: "GET",
          redirect: "follow",
        });
        const contentType = upstream.headers.get("content-type");
        const cacheControl = upstream.headers.get("cache-control");
        const contentLength = upstream.headers.get("content-length");

        res.statusCode = upstream.status;
        if (contentType) {
          res.setHeader("content-type", contentType);
        }
        if (cacheControl) {
          res.setHeader("cache-control", cacheControl);
        }
        if (contentLength) {
          res.setHeader("content-length", contentLength);
        }
        res.setHeader("access-control-allow-origin", "*");

        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.end(buffer);
      } catch (error) {
        res.statusCode = 502;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end(`image proxy error: ${String(error)}`);
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), tsconfigPaths(), imageProxyPlugin],
  server: {
    proxy: {
      "/api/ark": {
        target: "https://ark.cn-beijing.volces.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ark/, "/api/v3"),
      },
    },
  },
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
