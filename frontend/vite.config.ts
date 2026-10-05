import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
      { find: '@bindings', replacement: fileURLToPath(new URL('./bindings', import.meta.url)) },
      { find: '@assets', replacement: fileURLToPath(new URL('../assets', import.meta.url)) },
      { find: '@frontend', replacement: fileURLToPath(new URL('./', import.meta.url)) },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 9245,
    strictPort: true,
  },
});
