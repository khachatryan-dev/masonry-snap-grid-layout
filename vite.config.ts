import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        react: path.resolve(__dirname, 'src/react/index.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['react']
    },
    sourcemap: true,
    emptyOutDir: true
  }
});