export type LayoutMode = 'auto' | 'css' | 'js';

export interface MasonryOptions<T> {
  /** Engine strategy: 'auto' uses CSS masonry if supported, else JS fallback. Default: 'auto' */
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
