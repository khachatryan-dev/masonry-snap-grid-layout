import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/react.tsx', 'src/vue.ts'], // core, React wrapper, Vue wrapper
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'esnext',
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom', 'vue'], // important: don't bundle React/Vue
    outExtension: ({ format }) => ({
        js: format === 'esm' ? '.mjs' : '.cjs'
    }),
    esbuildOptions(options) {
        options.tsconfig = './tsconfig.json';
    },
});
