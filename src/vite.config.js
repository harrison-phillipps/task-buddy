import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');
const reactJsxRuntime = path.resolve(__dirname, 'node_modules/react/jsx-runtime');
const reactJsxDevRuntime = path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime');

// Custom plugin to enforce a single React instance by intercepting all resolutions
function singleReactPlugin() {
  return {
    name: 'single-react-instance',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'react') return reactPath + '/index.js';
      if (id === 'react-dom') return reactDomPath + '/index.js';
      if (id === 'react-dom/client') return reactDomPath + '/client.js';
      if (id === 'react/jsx-runtime') return reactJsxRuntime + '.js';
      if (id === 'react/jsx-dev-runtime') return reactJsxDevRuntime + '.js';
      return null;
    },
  };
}

export default defineConfig({
  server: {
    allowedHosts: ['.'],
  },
  cacheDir: 'node_modules/.vite_cache_v9',
  plugins: [singleReactPlugin(), base44()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react': reactPath,
      'react-dom': reactDomPath,
      'react/jsx-runtime': reactJsxRuntime,
      'react/jsx-dev-runtime': reactJsxDevRuntime,
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
      'sonner',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-slider',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      '@radix-ui/react-avatar',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-slot',
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
      'sonner',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-slider',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      '@radix-ui/react-avatar',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-slot',
    ],
    force: true,
  },
});