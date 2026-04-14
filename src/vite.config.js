import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    allowedHosts: ['.'],
  },
  plugins: [base44()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'scheduler',
    ],
  },
  optimizeDeps: {
    // By NOT including sonner/vaul here, they get bundled together with
    // the main app chunk and share its React instance instead of getting
    // a separate pre-bundled chunk with their own React copy
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'scheduler',
      '@tanstack/react-query',
      'react-router-dom',
      'framer-motion',
    ],
    exclude: ['sonner', 'vaul'],
    force: true,
  },
});