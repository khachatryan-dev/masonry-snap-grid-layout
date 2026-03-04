import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [react(), vue()],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'react/index': path.resolve(__dirname, 'src/react/index.ts'),
        'vue/index': path.resolve(__dirname, 'src/vue/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'vue'],
      output: {
        assetFileNames: '[name][extname]',
        preserveModules: false,
      },
    },
    sourcemap: false,
    minify: false,
    emptyOutDir: true,
  },
});
