/**
 * Public API of the `core` slice.
 *
 * Every adapter — Vanilla, React, Vue, Angular — imports from this module and
 * nothing else inside `core`. Reaching directly into `core/model`, `core/lib`,
 * or `core/engine` from an adapter is rejected by ESLint, so this file is the
 * single place where the shared surface is defined and reviewed.
 *
 * Internal structure behind this barrel:
 *
 *   model/   pure logic — no DOM access, no globals, trivially unit-testable
 *   lib/     browser primitives — observers, scroll listeners, frame scheduling
 *   engine/  imperative DOM writers for the Vanilla engine
 *
 * Dependencies point strictly inward: engine -> lib -> model. `model` imports
 * from neither of the others, which is what keeps the layout algorithm free of
 * environment assumptions.
 */

// ── model: pure logic ─────────────────────────────────────────────────────────
export type {
  MasonryOptions,
  LayoutMode,
  LayoutInfo,
  ColumnsOption,
  ItemPosition,
  ScrollState,
} from './model/types';
export { EMPTY_SCROLL_STATE } from './model/types';

export { computeLayout } from './model/layout';
export type { LayoutResult, ComputeLayoutParams } from './model/layout';

export {
  getColumnCount,
  resolveColumnCount,
  resolveBreakpoints,
} from './model/columns';

export { computeVisibleIndices, canVirtualize } from './model/virtualization';
export type { VisibleRangeParams } from './model/virtualization';

// ── lib: browser primitives ───────────────────────────────────────────────────
export { createScheduler } from './lib/schedule';
export type { Scheduler } from './lib/schedule';

export {
  createScrollTracker,
  readScrollState,
  resolveScrollTarget,
  scrollStatesEqual,
} from './lib/scroll';
export type { ScrollTargetOption } from './lib/scroll';

export { createItemObserver } from './lib/measure';
export type { ItemObserver, ItemObserverOptions } from './lib/measure';

export { supportsCss } from './lib/supports';

// ── engine: imperative DOM writers ────────────────────────────────────────────
export { applyMasonryLayout, removeMasonryLayout } from './engine/jsEngine';
export type { ApplyLayoutExtras } from './engine/jsEngine';

export { applyCssMasonry, removeCssMasonry } from './engine/cssEngine';
