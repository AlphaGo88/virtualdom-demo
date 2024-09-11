import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

function resolve(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    root: command === 'serve' ? 'play' : '.',
    define: {
      __DEV__: command === 'serve',
    },
    resolve: {
      alias: {
        vdom: resolve('./src'),
        core: resolve('./src/core'),
        dom: resolve('./src/dom'),
        shared: resolve('./src/shared'),
      },
    },
  };
});
