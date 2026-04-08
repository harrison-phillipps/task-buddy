import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [base44()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    alias: {
      'react': resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime'),
    },
  },
  optimizeDeps: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true,
  },
});