import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default as (opts: object) => object;
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    preact(),
    vanillaExtractPlugin(),
    // Monaco workers — we use a custom language only, no TS/JSON/CSS workers needed
    monacoEditorPlugin({ languageWorkers: [] }),
  ],
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
          'monaco': ['monaco-editor'],
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
