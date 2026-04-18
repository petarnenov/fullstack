import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
    federation({
      name: "mfe_trading",
      filename: "remoteEntry.js",
      exposes: {
        "./TradingPage": "./src/pages/TradingPage",
        "./PortfolioWidget": "./src/widgets/PortfolioWidget",
      },
      shared: ["react", "react-dom", "@tanstack/react-query"],
    }),
  ],
  server: {
    port: 5176,
    host: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5176,
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
