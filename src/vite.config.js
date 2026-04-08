import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';

// FINAL FIX: v21-minimal-bundle-20260408
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
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});