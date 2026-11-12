import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/@monaco-editor/')) return 'monaco-react';
          const language = id.match(/\/monaco-editor\/esm\/vs\/basic-languages\/([^/]+)\//);
          if (language) return `monaco-language-${language[1]}`;
          if (id.includes('/monaco-editor/')) return 'monaco-core';
          if (id.includes('/react-dom/') || id.includes('/scheduler/') || id.includes('/react/')) return 'react-vendor';
        }
      }
    }
  }
});
