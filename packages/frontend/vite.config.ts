import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const ReactCompilerConfig = {
  /* ... */
};

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
        ],
      },
    }),
    federation({
      name: 'hostApp',
      remotes: {
        microFrontend: 'http://localhost:5174/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', '@tanstack/react-query'],
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
  },
});
