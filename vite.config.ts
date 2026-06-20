import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const ORACLE = 'https://aim-oracle.fly.dev';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: {
      '/api': { target: ORACLE, changeOrigin: true },
      '/ws':  { target: ORACLE.replace('https', 'wss'), changeOrigin: true, ws: true },
    },
  },
});
