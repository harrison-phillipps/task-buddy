import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const r = (p) => path.resolve(__dirname, 'node_modules', p);

export default defineConfig({
  server: {
    allowedHosts: ['.'],
  },
  plugins: [base44()],
  resolve: {
    // dedupe ensures only ONE copy of React is ever resolved, regardless of
    // how many packages try to import their own bundled version
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
      'vaul',
      'sonner',
      'scheduler',
    ],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Hard-pin every React import to the exact same file on disk
      'react': r('react/index.js'),
      'react-dom': r('react-dom/index.js'),
      'react-dom/client': r('react-dom/client.js'),
      'react/jsx-runtime': r('react/jsx-runtime.js'),
      'react/jsx-dev-runtime': r('react/jsx-dev-runtime.js'),
      // scheduler is the internal package React uses for hooks — dedupe it too
      'scheduler': r('scheduler/index.js'),
    },
  },
  optimizeDeps: {
    // Bundle all of these together in ONE esbuild pass so they share
    // the same React instance in the output chunk
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'scheduler',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
      'vaul',
      'sonner',
    ],
    force: true,
  },
});