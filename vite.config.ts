import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        sidebar: 'src/sidebar/index.html',
        reader: 'src/reader/index.html',
        onboarding: 'src/onboarding/index.html',
      },
    },
  },
  // Transformers.js requires this for WASM
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
  worker: {
    format: 'es',
  },
});
