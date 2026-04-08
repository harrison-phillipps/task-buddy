import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Custom plugin: intercepts ALL React module requests and redirects them
// to the single canonical copy in node_modules, regardless of which package
// is requesting it. This prevents @base44/sdk from pulling in its own React.
function singleReactPlugin() {
  const reactMap = {
    'react': resolve(__dirname, 'node_modules/react/index.js'),
    'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
    'react/jsx-dev-runtime': resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    'react-dom': resolve(__dirname, 'node_modules/react-dom/index.js'),
    'react-dom/client': resolve(__dirname, 'node_modules/react-dom/client.js'),
    'react-dom/server': resolve(__dirname, 'node_modules/react-dom/server.js'),
  };

  return {
    name: 'single-react-instance',
    enforce: 'pre',
    resolveId(id) {
      if (reactMap[id]) return reactMap[id];
    },
  };
}

// cache-bust: v5
export default defineConfig({
  plugins: [singleReactPlugin(), base44()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    alias: {
      'react': resolve(__dirname, 'node_modules/react/index.js'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom/index.js'),
      'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
  optimizeDeps: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true,
  },
});