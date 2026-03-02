## Contributing to `masonry-snap-grid-layout`

Thank you for your interest in contributing – thoughtful changes are very welcome.

This document explains how to work with the codebase and open high‑quality pull requests.

---

### 1. Project overview

- **Core engine**: framework‑agnostic `MasonrySnapGridLayout` (vanilla JS / TS).
- **React wrapper**: `masonry-snap-grid-layout/react` – SSR‑friendly component.
- **Vue 3 wrapper**: `masonry-snap-grid-layout/vue` – composition‑based wrapper component.
- **Angular**: integrates via the core engine (no Angular library inside this repo).

The goal is to keep the core small, fast, and framework‑agnostic, and keep wrappers thin.

---

### 2. Development setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/khachatryan-dev/masonry-snap-grid-layout.git
   cd masonry-snap-grid-layout
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run tests**

   ```bash
   npm test
   ```

4. **Build the library**

   ```bash
   npm run build
   ```

You should see the compiled artifacts in the `dist/` folder.

---

### 3. Coding guidelines

- **TypeScript**
  - Keep `strict` mode happy; avoid `any` unless absolutely necessary.
  - Prefer explicit types on public APIs, props, and options.
- **API design**
  - Do not break the public API without discussing it in an issue first.
  - Keep the core engine framework‑agnostic; React/Vue logic should live only in their wrappers.
  - New options should be added to `MasonrySnapGridLayoutOptions` with clear JSDoc.
- **Styling**
  - `index.css` is intentionally minimal; avoid embedding opinionated theme styles.
  - Prefer class‑based hooks (`classNames`) over hard‑coding visual design.

---

### 4. Tests

Before opening a PR, please make sure:

- All tests pass:

  ```bash
  npm test
  ```

- New behavior is covered by tests where it makes sense:
  - Core layout behavior → `src/__tests__/MasonrySnapGridLayout.core.test.ts`
  - React wrapper behavior → `src/__tests__/react.test.tsx`
  - Framework‑style usage patterns (Angular/Vue via core) → `src/__tests__/framework-usage.angular-vue.test.ts`

If you add new features to the React or Vue wrappers, consider adding or extending tests accordingly.

---

### 5. Branching & pull requests

- **Branch names**

  - Feature: `feat/<short-description>` (e.g. `feat/css-masonry-tuning`)
  - Fix: `fix/<short-description>` (e.g. `fix/react-cleanup-memory`)

- **Commit messages**

  - Aim for clear, action‑oriented titles:
    - `feat: add layoutMode option`
    - `fix: clean up React roots on unmount`

- **Pull request checklist**

  - Describe the motivation and behavior change.
  - Note any breaking changes (and why they are necessary).
  - Include screenshots or GIFs if the change is visual.
  - Confirm that `npm test` and `npm run build` succeed locally.

---

### 6. Release & versioning

- Version bumps and npm publishing are handled via **GitHub Actions** (`.github/workflows/publish.yml`).
- The CI workflow:
  - Runs tests.
  - Bumps patch version.
  - Builds the package.
  - Publishes to npm when changes land on `main` (with the proper token configured).

Please **do not** manually run `npm publish` from your local environment unless you are maintaining the project and coordinating releases.

---

### 7. Questions / issues

If you’re unsure whether a change fits the project:

- Open a **GitHub issue** describing:
  - The problem you’re solving.
  - How you propose to solve it.
  - Any potential breaking changes or trade‑offs.

Discussion first → implementation later keeps the library stable and predictable for users.

