import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';

// AGGRESSIVE CACHE BUST: v20-force-clear-20260408
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
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      '@base44/sdk',
      'sonner',
    ],
    force: true,
  },
  server: {
    middlewareMode: true,
  },
});