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

  const resolved = new Set(Object.values(reactMap));

  return {
    name: 'single-react-instance',
    enforce: 'pre',
    resolveId(id, importer) {
      if (reactMap[id]) return reactMap[id];
      // If something tries to resolve react from inside node_modules (nested), intercept it
      if (importer && importer.includes('node_modules') && reactMap[id]) {
        return reactMap[id];
      }
    },
    load(id) {
      // No-op — just ensure resolution is canonical
    },
  };
}

// cache-bust: v15-force-20260408
export default defineConfig({
  plugins: [singleReactPlugin(), base44()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', '@tanstack/react-query', '@base44/sdk', 'next-themes', 'sonner', '@radix-ui/react-tooltip', '@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover'],
    alias: {
      'react': resolve(__dirname, 'node_modules/react/index.js'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom/index.js'),
      'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
  optimizeDeps: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', '@base44/sdk', 'next-themes', 'sonner'],
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@base44/sdk',
      'next-themes',
      'sonner',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-slider',
      '@radix-ui/react-label',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-avatar',
      '@tanstack/react-query',
    ],
    force: true,
    esbuildOptions: {
      // Force esbuild to use a single React instance
      define: { 'process.env.NODE_ENV': JSON.stringify('development') },
    },
  },
});