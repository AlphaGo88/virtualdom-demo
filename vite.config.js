import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

function resolve(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    define: {
      __DEV__: command === 'serve',
    },
    resolve: {
      alias: {
        vdom: resolve('./src/vdom'),
        core: resolve('./src/vdom/core'),
        dom: resolve('./src/vdom/dom'),
        shared: resolve('./src/vdom/shared'),
      },
    },
  };
});
