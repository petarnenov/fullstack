import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import { resolve } from "node:path";

const ReactCompilerConfig = {};

// Repo-root .env is the single source of truth for demo-wide settings like
// PUBLIC_HOST. loadEnv doesn't populate process.env automatically, so we read
// the returned map. Prefix "" means "load all vars", not just VITE_*.
const REPO_ROOT = resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, "");
  const PUBLIC_HOST = env.PUBLIC_HOST || "localhost";

  return {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
        },
      }),
      federation({
        name: "platform_shell",
        remotes: {
          mfe_billing: `http://${PUBLIC_HOST}:5175/assets/remoteEntry.js`,
          mfe_open_account: `http://${PUBLIC_HOST}:5174/assets/remoteEntry.js`,
          mfe_trading: `http://${PUBLIC_HOST}:5176/assets/remoteEntry.js`,
        },
        shared: ["react", "react-dom", "@tanstack/react-query"],
      }),
    ],
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "esnext",
    },
    css: {
      modules: {
        localsConvention: "camelCase",
      },
    },
  };
});
