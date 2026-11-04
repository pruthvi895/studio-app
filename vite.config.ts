import { renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function capacitorIndex(): Plugin {
  return {
    name: 'capacitor-index',
    apply: 'build',
    closeBundle() {
      renameSync(resolve('dist/index-mobile.html'), resolve('dist/index.html'));
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react(), capacitorIndex()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index-mobile.html',
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
}));
