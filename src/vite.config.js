import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve to exact absolute paths so every package shares one React copy
const r = (p) => path.resolve(__dirname, 'node_modules', p);

export default defineConfig({
  server: {
    allowedHosts: ['.'],
  },
  plugins: [base44()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Force every importer to resolve to the exact same React file on disk
      'react': r('react/index.js'),
      'react-dom': r('react-dom/index.js'),
      'react-dom/client': r('react-dom/client.js'),
      'react/jsx-runtime': r('react/jsx-runtime.js'),
      'react/jsx-dev-runtime': r('react/jsx-dev-runtime.js'),
      // Force single instances of packages that bundle React hooks internally
      'vaul': path.resolve(__dirname, 'node_modules/vaul'),
      'sonner': path.resolve(__dirname, 'node_modules/sonner'),
    },
    dedupe: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
      'vaul',
      'sonner',
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
      'vaul',
      'sonner',
    ],
    force: true,
  },
});