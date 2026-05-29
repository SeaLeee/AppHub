import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'electron/shared'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'electron-store', 'pidusage', 'node-cron'],
            },
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'electron/shared'),
            },
          },
        },
      },
      preload: {
        input: 'electron/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: { external: ['electron'] },
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'electron/shared'),
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  server: {
    port: 5174,
  },
});
