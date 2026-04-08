import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';

// v22-skip-tanstack-prebundle-20260408
export default defineConfig({
  plugins: [react(), base44()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true,
  },
});