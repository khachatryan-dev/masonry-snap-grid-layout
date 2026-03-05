# Changelog

All notable changes to this project are documented here.

---

## [1.2.2] — 2025

### Changed
- Removed `layoutMode: 'css'` — it was a footgun that could force CSS masonry in browsers that don't support it. Use `'auto'` instead (picks CSS masonry when supported, JS otherwise).
- `layoutMode` now accepts only `'auto' | 'js'`.

### Added
- **Scroll virtualization** for React and Vue components (`virtualize` + `overscan` props) — only renders items in/near the viewport, keeping DOM size bounded for large lists.
- **SSR output** — all items are rendered in the initial HTML (visible in page source when using Next.js, Nuxt, or any SSR framework).
- Vanilla JS example converted to a proper Vite project (`npm install && npm run dev`) — no more CORS issues or path traversal limitations.
- React and Vue examples updated with virtualization controls, overscan slider, and engine badge.
- Angular example updated with layout mode toggle, animate toggle, and engine/count badges.

### Fixed
- React component: ResizeObserver was reconnecting on every items change (caused an extra layout cycle each time items were updated). Fixed by using a stable `computeLayoutRef` pattern so the ResizeObserver effect no longer depends on `computeLayout`.
- React component: `isMeasured` reset on items change could leave virtualization in a broken state where new items were never measured. Fixed by adding a secondary layout effect that triggers whenever `isMeasured` transitions to `false`.

---

## [1.2.1] — 2025

### Fixed
- CI/CD workflow YAML syntax fix.

---

## [1.2.0] — 2025

### Added
- Vue 3 component (`masonry-snap-grid-layout/vue`) with scoped slot API.
- Angular support (`masonry-snap-grid-layout/angular`) — exports TypeScript source for consumption by the Angular compiler.
- `layoutMode: 'auto'` — automatically detects native CSS masonry support via `CSS.supports('grid-template-rows', 'masonry')`.
- `animate` and `transitionDuration` options for smooth JS layout transitions.
- `ResizeObserver`-based responsive layout.
- SSR-safe React component with `isMounted` pattern to avoid hydration mismatches.

---

## [1.0.0] — 2025

### Added
- Initial release: zero-dependency masonry layout engine for Vanilla JS and React.
- TypeScript-first with generic `<T>` items.
- JS masonry engine using `position: absolute` + `transform: translate()`.
- Native CSS masonry engine via `grid-template-rows: masonry`.
- `updateItems()` and `destroy()` methods.
- Vitest test suite.
