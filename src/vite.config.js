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
      // Force ALL react imports to resolve to the exact same singleton
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    force: true,
    exclude: ['sonner'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'react-hot-toast',
    ],
  },
});