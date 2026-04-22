import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// Reporting is the first MFE backed by a dedicated BFF (packages/bff-reporting
// on :8090) instead of the monolith on :8088. Only /api/reporting/* is proxied
// here — this MFE must not reach the monolith directly. See CLAUDE.md
// constraint #8.
const apiProxy = {
  "/api/reporting": {
    target: "http://localhost:8090",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
    federation({
      name: "mfe_reporting",
      filename: "remoteEntry.js",
      exposes: {
        "./ReportingPage": "./src/pages/ReportingPage",
        "./ReportingSummaryWidget": "./src/widgets/ReportingSummaryWidget",
      },
      shared: ["react", "react-dom", "@tanstack/react-query"],
    }),
  ],
  server: {
    port: 5177,
    host: true,
    cors: true,
    proxy: apiProxy,
  },
  preview: {
    port: 5177,
    host: true,
    cors: true,
    proxy: apiProxy,
  },
  build: {
    target: "esnext",
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});
