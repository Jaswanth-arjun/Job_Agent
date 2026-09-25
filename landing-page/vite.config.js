import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/linkedin-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/linkedin-api/, ''),
      },
    },
  },
});

