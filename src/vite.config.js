import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

// v22-skip-tanstack-prebundle-20260408
export default defineConfig({
  plugins: [react(), base44()],
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
      '@radix-ui/react-context-menu',
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'next-themes',
      'sonner',
      'react/jsx-runtime',
      '@radix-ui/react-context-menu',
    ],
    force: ['react', 'react-dom', 'react/jsx-runtime', 'next-themes', 'sonner'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  ssr: {
    noExternal: ['next-themes', 'sonner'],
  },
});