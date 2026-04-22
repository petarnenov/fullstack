import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
    federation({
      name: "mfe_billing",
      filename: "remoteEntry.js",
      exposes: {
        "./BillingPage": "./src/pages/BillingPage",
        "./OutstandingBalanceWidget":
          "./src/widgets/OutstandingBalanceWidget",
      },
      shared: ["react", "react-dom", "@tanstack/react-query"],
    }),
  ],
  server: {
    port: 5175,
    host: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5175,
    host: true,
    cors: true,
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
