import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(), // Inject CSS into JS for Module Federation
    federation({
      name: "micro_frontend",
      filename: "remoteEntry.js",
      exposes: {
        "./MicroPage": "./src/pages/MicroPage",
      },
      shared: {
        react: { singleton: true, strictVersion: false },
        "react-dom": { singleton: true, strictVersion: false },
        "@tanstack/react-query": { singleton: true, strictVersion: false },
      },
    }),
  ],
  build: {
    target: "esnext",
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
  server: {
    port: 5174,
    cors: true,
  },
  preview: {
    port: 5174,
    cors: true,
  },
});
