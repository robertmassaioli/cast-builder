import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [preact()],
  // GitHub Pages deploys to https://robertmassaioli.github.io/cast-builder/
  base: '/cast-builder/',
  resolve: {
    alias: {
      // Allow importing example files from packages/core/examples/ via ?raw
      '@examples': resolve(__dirname, '../core/examples'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy dependencies into separate chunks for better caching
          'codemirror': ['codemirror', '@codemirror/state', '@codemirror/view',
                         '@codemirror/language', '@codemirror/autocomplete',
                         '@codemirror/commands', '@lezer/highlight'],
          'player': ['asciinema-player'],
          'core': ['@cast-builder/core'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['asciinema-player'],
  },
});
