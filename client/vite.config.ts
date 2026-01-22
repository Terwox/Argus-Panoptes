import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const clientDir = dirname(__filename);

export default defineConfig({
  plugins: [svelte()],
  root: '.',
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            join(clientDir, 'index.html'),
            join(clientDir, 'src/**/*.{svelte,js,ts}'),
          ],
          theme: {
            extend: {
              colors: {
                blocked: '#f59e0b',
                working: '#3b82f6',
                idle: '#4b5563',
                success: '#22c55e',
              },
            },
          },
        }),
        autoprefixer,
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/events': 'http://localhost:4242',
      '/state': 'http://localhost:4242',
      '/ws': {
        target: 'ws://localhost:4242',
        ws: true,
      },
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
});
