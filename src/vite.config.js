import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';

// v22-skip-tanstack-prebundle-20260408
export default defineConfig({
  plugins: [base44()],
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      '@base44/sdk',
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
    ],
    exclude: [
      '@tanstack/react-query',
    ],
    force: true,
  },
});