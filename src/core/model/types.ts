import type { ColumnsOption } from './columns';
import type { ItemPosition } from './layout';

export type LayoutMode = 'auto' | 'js';

/**
 * Scroll geometry, expressed in the scroll target's own coordinate space so
 * that window and element scrolling share one set of maths.
 *
 * Defined here, in the pure model, rather than alongside the DOM-facing scroll
 * tracker that produces it — otherwise the pure virtualization logic would
 * depend on a browser module just to name its own input.
 */
export interface ScrollState {
  /** How far the target has scrolled. */
  scrollOffset: number;
  /** Visible extent of the target along the scroll axis. */
  viewportSize: number;
  /** The grid container's top edge, in the target's scroll space. */
  containerOffset: number;
}

export const EMPTY_SCROLL_STATE: ScrollState = {
  scrollOffset: 0,
  viewportSize: 0,
  containerOffset: 0,
};

export type { ColumnsOption, ItemPosition };

/** Reported to `onLayout` after each successful layout pass. */
export interface LayoutInfo {
  /** Number of columns used. */
  columnCount: number;
  /** Width of a single column in pixels. */
  columnWidth: number;
  /** Total content height of the grid in pixels. */
  containerHeight: number;
  /** Number of items positioned. */
  itemCount: number;
  /** Which engine produced this layout. */
  engine: 'css' | 'js';
}

/**
 * Options shared by the vanilla engine and every framework adapter.
 * Every field beyond `items` and `renderItem` is optional.
 */
export interface MasonryOptions<T> {
  /**
   * Engine strategy.
   * - `'auto'` (default) — uses native CSS `grid-template-rows: masonry` when the
   *   browser supports it; falls back to JS absolute-positioning masonry otherwise.
   * - `'js'` — always uses JS masonry, regardless of browser support.
   */
  layoutMode?: LayoutMode;
  /** Space between items in pixels. Default: 16 */
  gutter?: number;
  /** Minimum column width in pixels. Default: 250 */
  minColWidth?: number;
  /**
   * Fixed column count, or a mobile-first map of `minContainerWidth -> columns`
   * such as `{ 0: 1, 640: 2, 1024: 3 }`. Overrides `minColWidth` when set.
   */
  columns?: ColumnsOption;
  /** Enable smooth JS animations on layout changes. Default: true */
  animate?: boolean;
  /** Transition duration in ms (JS mode only). Default: 400 */
  transitionDuration?: number;
  /**
   * Watch each item for size changes so the layout self-heals when content
   * settles after the first measurement — images decoding, fonts swapping,
   * embeds resizing. Default: true
   */
  observeItemResize?: boolean;
  /**
   * Additionally listen for `load`/`error` on images inside items. Default: true
   */
  watchImages?: boolean;
  /**
   * Height in pixels assumed for items that have not been measured yet.
   *
   * Supplying this lets large virtualized lists skip the render-everything
   * measurement pass, because positions can be estimated before any item is
   * mounted. Measured heights always take precedence once available.
   */
  estimatedItemHeight?: number;
  /**
   * Stable identity for an item, used to reuse DOM nodes across updates
   * instead of rebuilding them. Strongly recommended whenever items can be
   * reordered, filtered, or prepended — without it, position `i` is the only
   * identity available, so node `i` is reused for whatever now sits there.
   */
  getItemKey?: (item: T, index: number) => string | number;
  /** Called after every successful layout pass. */
  onLayout?: (info: LayoutInfo) => void;
  /** Array of data items to render */
  items: T[];
  /** Function that receives an item and returns an HTMLElement */
  renderItem: (item: T, index: number) => HTMLElement;
}
