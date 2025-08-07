// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'esnext',
    splitting: false,
    sourcemap: true,
    esbuildOptions(options) {
        options.tsconfig = './tsconfig.json';
    },
});