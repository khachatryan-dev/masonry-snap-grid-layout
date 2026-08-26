# Architecture

A short map of the codebase for anyone making a change. If you only read one
thing: **the layout logic lives in `src/core/`, and the framework folders are
thin shells over it.** A fix belongs in the core so that all four adapters get
it at once.

## Why it is shaped this way

Before v1.3.0 the shortest-column algorithm existed in three separate copies —
the Vanilla engine, the React component, and the Vue component. They drifted.
A scroll-offset fix landed in React and silently never reached Vue, and nothing
in the repo could have told you.

So the algorithm now exists exactly once, and the layering is checked by
`npm run check:arch` rather than left to reviewer memory.

## Layout

```
src/
├── index.ts                  package entry point
│
├── core/                     shared, framework-agnostic
│   ├── index.ts              ← the core's PUBLIC API
│   ├── model/                pure logic — no DOM, no globals
│   │   ├── types.ts          options, LayoutInfo, ScrollState
│   │   ├── columns.ts        column count + breakpoint resolution
│   │   ├── layout.ts         shortest-column placement
│   │   └── virtualization.ts visible-window maths
│   ├── lib/                  browser primitives
│   │   ├── schedule.ts       animation-frame coalescing
│   │   ├── scroll.ts         window/element scroll tracking
│   │   ├── measure.ts        per-item + image observation
│   │   └── supports.ts       CSS feature detection
│   └── engine/               imperative DOM writers
│       ├── jsEngine.ts       absolute positioning + transforms
│       └── cssEngine.ts      native CSS masonry properties
│
├── vanilla/                  adapter — the MasonrySnapGridLayout class
├── react/                    adapter — MasonrySnapGrid component
├── vue/                      adapter — MasonrySnapGrid SFC
├── angular/                  adapter — MasonrySnapGridComponent
└── styles/                   the shipped stylesheet
```

## The rules

Dependencies point strictly **inward**. Nothing may import an adapter.

| Layer         | May import                      | Rationale                                                               |
| ------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `core/model`  | `core/model`                    | Pure. No DOM, no globals — which is what makes it trivial to unit-test. |
| `core/lib`    | `core/model`                    | Browser primitives. May use the model, never the DOM-writing engine.    |
| `core/engine` | `core/model`, `core/lib`        | Imperative DOM writers.                                                 |
| `core/index`  | all core segments               | The only module that may re-export from every segment.                  |
| `vanilla`     | `core` (barrel only)            | Adapter.                                                                |
| `react`       | `core` (barrel only)            | Adapter.                                                                |
| `vue`         | `core` (barrel only)            | Adapter.                                                                |
| `angular`     | `core` (barrel only), `vanilla` | Wraps the Vanilla engine — the one permitted adapter-to-adapter edge.   |

Two consequences worth internalising:

1. **Adapters never reach into `core/model`, `core/lib`, or `core/engine`.**
   They import from `src/core` and nothing else. If something you need is not
   exported there, add it to `src/core/index.ts` deliberately — that file is the
   reviewable record of the shared surface.
2. **`core/model` stays pure.** It is the reason the algorithm can be tested
   without a DOM, and the reason the same code runs identically under four
   frameworks. Needing a browser API inside `model` is a signal the logic
   belongs in `lib` instead.

Import cycles are also rejected.

## Making a change

| Change                         | Where it goes                                    |
| ------------------------------ | ------------------------------------------------ |
| Placement / column behaviour   | `core/model/layout.ts`, `core/model/columns.ts`  |
| What is visible when scrolling | `core/model/virtualization.ts`                   |
| Scroll or resize handling      | `core/lib/scroll.ts`                             |
| Reacting to content resizing   | `core/lib/measure.ts`                            |
| A new option                   | `core/model/types.ts`, then each adapter's props |
| Framework-specific wiring only | that adapter's folder                            |

Adding a genuinely new capability usually means: extend `core/model` (with unit
tests), export it from `src/core/index.ts`, then surface it as a prop or input in
each adapter.

## Verification

`npm run verify` runs the whole gate, in CI order:

| Command                 | Checks                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `npm run lint`          | ESLint, zero warnings tolerated                               |
| `npm run format:check`  | Prettier                                                      |
| `npm run check:arch`    | Layer boundaries and import cycles                            |
| `npm run typecheck`     | Three compilers: `tsc`, the Angular config, and `vue-tsc`     |
| `npm test`              | 194 tests across all four adapters                            |
| `npm run build`         | Vite library build plus declarations                          |
| `npm run size`          | Minified+gzipped budget per entry, including shared chunks    |
| `npm run check:package` | Packs the tarball and verifies every export actually resolves |

The last one exists because `masonry-snap-grid-layout/angular` shipped broken for
several releases: it publishes TypeScript source importing across slices, and
those slices were missing from `files`. Nothing in the working tree can reveal
that — only the packed tarball can.

## Testing notes

Tests live in `tests/`, mirroring the layers: `core-layout`, `core-columns`
(inside `core-layout`), `core-virtualization`, `core-scroll`, `core-measure` for
the pure and primitive layers, then `core` (Vanilla engine), `react`, `vue`, and
`angular` for the adapters.

`tests/setup.ts` carries the shared harness. Two pieces matter:

- **`mockRectGeometry`** — jsdom hard-codes `getBoundingClientRect()` to
  `top: 0`. Virtualization derives the container's document offset from
  `rect.top + scrollY`, so a constant zero makes that offset track `scrollY` and
  cancel it out: the visible window never moves however far you scroll. Two
  virtualization tests were disabled for years because of this. The helper
  restores browser-accurate geometry.
- **`MockResizeObserver`** — jsdom ships no `ResizeObserver` at all, so without
  it the self-healing measurement path is silently inert in tests.
