import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      lib: { entry: 'src/main/index.ts' }
    }
  },
  preload: {
    build: {
      lib: { entry: 'src/preload/index.ts' }
    }
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: { input: resolve(__dirname, 'index.html') }
    }
  }
});
