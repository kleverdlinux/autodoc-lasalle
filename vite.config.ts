import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/docx/')) {
            return 'vendor-docx';
          }
          if (id.includes('node_modules/xlsx/')) {
            return 'vendor-xlsx';
          }
          if (
            id.includes('node_modules/jszip/') ||
            id.includes('node_modules/pizzip/') ||
            id.includes('node_modules/docxtemplater/') ||
            id.includes('node_modules/file-saver/')
          ) {
            return 'vendor-templates';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          return undefined;
        },
      },
    },
  },
});
