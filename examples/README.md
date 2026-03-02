## Local examples

This folder contains small example apps you can run locally to test
`masonry-snap-grid-layout` in different environments.

Each example keeps only **source files** in Git. The `node_modules` and build
artifacts are ignored.

### Structure

- `examples/vanilla/` – basic HTML + ES module usage.
- `examples/react/` – Vite-style React + TypeScript.
- `examples/vue/` – Vite-style Vue 3 + TypeScript.
- `examples/angular/` – minimal Angular shell instructions (uses Angular CLI).

---

### 1. Vanilla JS example

Folder: `examples/vanilla`

Files:

- `index.html`
- `main.js`

Run with any static server, for example:

```bash
cd examples/vanilla
npx serve .
```

---

### 2. React example

Folder: `examples/react`

Files:

- `package.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `src/main.tsx`
- `src/App.tsx`

Usage:

```bash
cd examples/react
npm install
npm run dev
```

---

### 3. Vue 3 example

Folder: `examples/vue`

Files:

- `package.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `src/main.ts`
- `src/App.vue`

Usage:

```bash
cd examples/vue
npm install
npm run dev
```

---

### 4. Angular example

Folder: `examples/angular`

This folder contains:

- `README.md` – explains how to:
  - Create an Angular app with the CLI.
  - Install `masonry-snap-grid-layout`.
  - Drop in the integration code from the main README.

Angular projects tend to be large and tightly coupled to specific versions of the
CLI and compiler, so only the **usage instructions** are kept in Git, not a full
generated Angular app.

