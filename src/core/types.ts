export type LayoutMode = 'auto' | 'js';

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
  /** Enable smooth JS animations on layout changes. Default: true */
  animate?: boolean;
  /** Transition duration in ms (JS mode only). Default: 400 */
  transitionDuration?: number;
  /** Array of data items to render */
  items: T[];
  /** Function that receives an item and returns an HTMLElement */
  renderItem: (item: T) => HTMLElement;
}
