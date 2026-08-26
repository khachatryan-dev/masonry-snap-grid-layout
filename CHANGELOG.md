# Changelog

All notable changes to this project are documented here.

---

## [1.3.0] — 2026-08-26

No breaking changes. Every new option is opt-in, except the self-healing layout
described below, which is on by default because the previous behaviour was simply
incorrect for any grid containing images.

### Added

- **Self-healing layout** — every item is now watched with its own `ResizeObserver`,
  and images inside items get `load`/`error` listeners, so the grid relayouts when
  content settles after first measurement. Opt out with `observeItemResize={false}`
  or `watchImages={false}`. Available in Vanilla, React, Vue, and Angular.
- **`columns`** — a fixed column count, or a mobile-first breakpoint map such as
  `{ 0: 1, 640: 2, 1024: 3 }` keyed on minimum _container_ width. Overrides
  `minColWidth`. Available in every adapter.
- **`scrollContainer`** (React, Vue) — virtualize inside an `overflow: auto` panel,
  modal, or dashboard pane instead of the page. Accepts an element, a React ref, a
  getter, or `window`. Virtualization previously only ever tracked the window, so it
  was inert inside a scrollable container.
- **`estimatedItemHeight`** — assumed height before measurement. Virtualization
  previously had to mount every item once to learn its height, defeating the purpose
  for very large lists; with an estimate the first render is already clipped.
- **`getItemKey`** — stable item identity. In React and Vue it becomes the `key`; in
  Vanilla and Angular it enables keyed reconciliation so `updateItems()` reuses
  existing elements instead of clearing the container, preserving focus, text
  selection, in-item scroll position, and in-flight media playback.
- **`onLayout`** (Vanilla, React, Angular `(layout)` output, Vue `@layout` event) —
  reports column count, column width, content height, item count, and which engine
  produced the layout.
- **`MasonrySnapGridLayout.setOptions()`** — change any option in place, including
  switching `layoutMode`, without destroying and rebuilding the instance.
- **`MasonrySnapGridLayout.refresh()`** and a Vue `refresh()` exposed via template
  ref — force a layout pass after mutating item content directly.
- `renderItem` now receives the item's index as a second argument in every adapter.
- Angular: `columns`, `estimatedItemHeight`, `observeItemResize`, `watchImages`,
  `getItemKey` inputs, a `(layout)` output, and a `refresh()` method.

### Fixed

- **The `masonry-snap-grid-layout/angular` entry point was broken on npm.** It
  publishes TypeScript source that imports `../core/*`, but `files` listed only
  `dist` and `src/angular` — so `src/core` was never published and the import could
  not resolve for any consumer installing from the registry. Angular support has been
  unusable from npm since it was introduced in 1.2.0, despite being documented. The
  core source is now published, and `npm run check:package` packs the tarball,
  extracts it, and verifies every `exports` target and every relative import in
  published source actually resolves — so this class of bug cannot ship again.
- **Angular: every input except `items` was ignored after first render.**
  `ngOnChanges` only handled `items`, so binding `[gutter]`, `[minColWidth]`,
  `[animate]`, `[transitionDuration]`, `[layoutMode]`, or `[renderItem]` to anything
  that changed silently did nothing. All option inputs are now forwarded.
- **Vue: the component had a fragment root, breaking attribute fallthrough.** A
  comment sibling of the root element made this a multi-root component, so `class`
  and `style` passed by a parent never applied. Because Vue keeps comments in
  development and strips them in production, this misbehaved only in dev builds.
- **Vue: the container's scroll offset was never refreshed while scrolling.**
  `onScroll` did not call `syncContainerTop()` — a fix React received in 1.2.3 that
  was never ported — so the visible window drifted out of alignment whenever content
  above the grid changed height mid-scroll.
- **React: `useLayoutEffect` warned on every server render.** React cannot run layout
  effects on the server and warns for each component that schedules one, polluting
  Next.js and Remix build logs. The ref it maintained is now assigned during render
  and the layout effect is gone.
- **Unthrottled scroll handling.** Every scroll event triggered a state update plus a
  `getBoundingClientRect()` — a forced synchronous reflow — so a single scroll gesture
  caused dozens of layout invalidations. Scroll, resize, item-resize, and image-load
  triggers are now coalesced into at most one layout per animation frame.
- **Detecting the window scroll target no longer uses `instanceof Window`**, which is
  false across realms (iframes, jsdom, SSR shims) and silently took the element code
  path for a window target.
- React: item ref callbacks are now stable per index. Inline closures changed identity
  every render, making React detach and reattach every item ref on each pass.
- The JS engine no longer interleaves DOM reads and writes. It previously read
  `offsetHeight` inside the placement loop, after writing widths — one forced reflow
  per item. Heights are now read in a single batch between the width and transform
  passes, as the code already claimed to do.
- Vanilla: `updateItems()` leaked observed elements. Removing a node from the DOM does
  not stop a `ResizeObserver` watching it, so the observer's set grew on every update —
  five updates of a three-item grid left 18 elements observed instead of 3.
- Vanilla: changing `renderItem` via `setOptions()` while `getItemKey` was set stranded
  the previous elements in the DOM, doubling the item count, because the reconcile pass
  had nothing left to remove after the key cache was cleared.
- A partial `ResizeObserver` polyfill lacking `unobserve` no longer throws.
- An in-flight observer callback can no longer schedule a layout after teardown.

### Changed

- **`src/` restructured into enforced layers.** The core is now split by
  responsibility — `core/model/` (pure logic, no DOM), `core/lib/` (browser
  primitives), `core/engine/` (imperative DOM writers) — behind a single public API at
  `src/core/index.ts`. The Vanilla engine moved out of `core/` into `src/vanilla/`, so
  all four adapters are siblings and `core/` holds only shared logic. Adapters now
  import from `src/core` alone instead of reaching into eight separate internal
  modules. No public API changed and the bundle is byte-identical.
- **Layer boundaries are enforced, not documented.** `npm run check:arch` resolves every
  relative import under `src/` (including inside `.vue` files) against a declared layer
  graph, rejects inward-only violations and import cycles, and runs in CI. The pure
  model can no longer acquire a browser dependency, and an adapter can no longer bypass
  the core's public API — the exact drift that let a scroll fix reach React but never
  Vue.
- Fixed a dependency inversion: pure `virtualization` logic imported its `ScrollState`
  type from the DOM-facing scroll module. That contract now lives in the model.
- Added [ARCHITECTURE.md](./ARCHITECTURE.md) documenting the layers, the dependency
  rules, where each kind of change belongs, and the jsdom testing caveats.
- Pinned the Vite build target to `es2020`, so the documented output syntax level is a
  guarantee rather than a default that could shift.
- **Internals consolidated into a framework-agnostic core.** The shortest-column
  algorithm previously existed in three separate copies — the vanilla engine, the React
  component, and the Vue component — which is why fixes landed in one and not the
  others. Placement, column resolution, virtualization maths, scroll tracking,
  measurement, and frame scheduling now live in `src/core/` and every adapter calls
  them. No public API changed.
- Bundle size grew from **1.6 kB to 3.6 kB** minified + gzipped for the React entry,
  including shared chunks — the cost of self-healing measurement, scroll-container
  support, and frame coalescing. The Vanilla entry went from 1.2 kB to 2.8 kB, and Vue
  from 1.7 kB to 3.8 kB.
- `npm run size` now measures and budgets **minified + gzipped** size rather than raw
  gzip. `dist/` ships unminified, so raw gzip overstated the real cost by roughly 40%
  and disagreed with the bundlephobia badge in the README. Earlier documented figures
  (~5.2 kB for React) were that inflated measure; the corrected numbers above are what
  consumers actually ship.

### Examples

- **All four demo apps rebuilt to exercise v1.3.0.** None of them previously used a
  single new option. Each now has controls for self-healing images, the three column
  modes, scroll containers, estimated heights, and keyed reordering, plus a status bar
  reporting the live engine and resolved layout from `onLayout`.
- The Angular example now uses the standalone `MasonrySnapGridComponent` rather than
  driving the engine by hand, so every control is a plain `@Input` — which is also what
  the README documents as the primary Angular path.
- The Vanilla example drives one instance through `setOptions()` instead of destroying
  and recreating the grid on every control change.
- **The examples are typechecked against local source in CI** (`npm run typecheck:examples`),
  with the package specifiers mapped to `src/`. A renamed prop now breaks the build
  rather than leaving a stale demo in the repo. ESLint covers them too.

### Testing and tooling

- Test count raised from 47 to **194**, now covering every adapter.
- **Vue and Angular have test suites for the first time** (33 and 19 tests). Angular
  also had no typechecking of any kind despite shipping as TypeScript source that
  compiles in the consumer's build.
- **Two disabled React virtualization tests are re-enabled and passing.** They were
  commented out because they could not work in jsdom, whose `getBoundingClientRect()`
  always returns `top: 0` — making the container's document offset track `scrollY` and
  cancel it out, so the visible window never moved. The harness now simulates
  browser-accurate scroll geometry. Scroll-based virtualization, the entire subject of
  1.2.3, had no working test coverage before this.
- `npm run typecheck` now runs three compilers: `tsc` for the core and React, a
  dedicated Angular config, and `vue-tsc` for the SFC.
- Added ESLint (flat config, with `react-hooks`) and Prettier, both enforced in CI.
- Added a gzipped bundle-size gate (`npm run size`) that measures each entry point
  including the shared chunks it pulls in.
- Added `npm run check:package`, which verifies the _packed tarball_ rather than the
  working tree — the only way to catch a missing published file.
- CI now runs lint, format check, three typechecks, tests on Node 18/20/22, build,
  size budget, published-package integrity, and `npm pack --dry-run`.
- Added `npm run verify` (and `prepublishOnly`) so a release cannot skip any of it.
- Removed 4.6 MB of committed Angular Vite build cache from git and ignored it.

---

## [1.2.3] — 2026

### Added

- **Full scroll virtualization support in React** — items outside the viewport are now correctly hidden and rendered dynamically using `'virtualize'` + `'overscan'`.
- **Stable item measurement and layout calculation** — prevents infinite recalculations and ensures item positions are accurate before virtualization runs.
- **ItemRefs synchronization** — `'itemRefs'` array now automatically matches `'items.length'` to avoid broken measurement or position misalignment.
- **Scroll container offset updates** — container absolute top position is recalculated on scroll/resize to prevent miscalculated visible items.
- Comments added throughout the React component for easier maintenance and readability.

### Fixed

- React component: **Item positions were not calculated on initial render** due to early virtualization checks. Fixed by computing layout after mount and measurement completion.
- React component: **Scroll virtualization did not work** when items were added or removed. Fixed by ensuring `'isMeasured'` and `'positions'` are updated correctly.
- React component: **ResizeObserver triggered infinite layout cycles** when container width changed. Fixed by tracking previous width and using stable `'computeLayoutRef'`.
- React component: `'isMeasured'` reset on items change no longer breaks virtualization.
- React component: Prevented unnecessary re-renders caused by `'computeLayout'` being in dependency arrays of effects.

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
