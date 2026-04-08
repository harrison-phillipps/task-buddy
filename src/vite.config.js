import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';

export default defineConfig({
  plugins: [base44()],
  cacheDir: '.vite',
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true,
  },
});