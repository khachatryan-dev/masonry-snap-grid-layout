import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/react.tsx'], // include your React wrapper entry
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'esnext',
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom'], // important: don't bundle React
    esbuildOptions(options) {
        options.tsconfig = './tsconfig.json';
    },
});
