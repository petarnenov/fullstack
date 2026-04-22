import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Standalone visualiser on :5199. Reads PUBLIC_HOST from the repo-root .env
// the same way platform-shell does, so a LAN demo can open the visualiser on
// a second screen without rewriting config.
const REPO_ROOT = resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, "");
  const PUBLIC_HOST = env.PUBLIC_HOST || "localhost";

  return {
    plugins: [react()],
    server: {
      port: 5199,
      strictPort: true,
      host: true,
      proxy: {
        // Visualiser talks to the telemetry service on :8091. Using a proxy
        // keeps the client URL relative (/api/telemetry/stream) which avoids
        // CORS headaches during long-lived SSE connections.
        "/api/telemetry": {
          target: "http://localhost:8091",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5199,
      strictPort: true,
      host: true,
      proxy: {
        "/api/telemetry": {
          target: "http://localhost:8091",
          changeOrigin: true,
        },
      },
    },
    define: {
      __PUBLIC_HOST__: JSON.stringify(PUBLIC_HOST),
    },
    build: {
      target: "esnext",
    },
  };
});
