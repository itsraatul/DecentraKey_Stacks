import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './server/public', // point to where your claim.js is
  build: {
    outDir: './js',        // bundle output to server/public/js
    emptyOutDir: true,
    rollupOptions: {
      input: {
        claim: path.resolve(__dirname, 'server/public/js/claim.js')
      }
    }
  },
  server: {
    port: 5173
  }
});
