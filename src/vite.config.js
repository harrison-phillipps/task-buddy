import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const reactPath = resolve(__dirname, 'node_modules/react');
const reactDomPath = resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  plugins: [base44()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    alias: [
      { find: /^react$/, replacement: resolve(reactPath, 'index.js') },
      { find: /^react\/jsx-runtime$/, replacement: resolve(reactPath, 'jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: resolve(reactPath, 'jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: resolve(reactDomPath, 'index.js') },
      { find: /^react-dom\/client$/, replacement: resolve(reactDomPath, 'client.js') },
    ],
  },
  optimizeDeps: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@base44/sdk > react',
      '@base44/sdk > react-dom',
    ],
    force: true,
  },
});