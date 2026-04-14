import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  server: {
    allowedHosts: ['.'],
  },
  plugins: [base44()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react': reactPath,
      'react-dom': reactDomPath,
      'react/jsx-runtime': path.resolve(reactPath, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(reactPath, 'jsx-dev-runtime.js'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      // Ensure esbuild uses the same React instance when pre-bundling deps
      alias: {
        'react': reactPath,
        'react-dom': reactDomPath,
      },
    },
    exclude: ['sonner', 'next-themes'],
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      'react-hot-toast',
      'framer-motion',
    ],
  },
});