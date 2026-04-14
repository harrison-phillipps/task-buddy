import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the single canonical React path
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
      'react/jsx-runtime': path.join(reactPath, 'jsx-runtime'),
      'react/jsx-dev-runtime': path.join(reactPath, 'jsx-dev-runtime'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler', 'sonner', 'vaul'],
  },
  optimizeDeps: {
    holdUntilCrawlEnd: true,
    exclude: ['sonner', 'vaul', 'react-hot-toast'],
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'scheduler',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
    ],
    force: true,
    esbuildOptions: {
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    },
  },
});