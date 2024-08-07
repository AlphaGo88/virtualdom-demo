import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      vdom: fileURLToPath(new URL('./src/vdom', import.meta.url)),
    },
  },
});
