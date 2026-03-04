export type LayoutMode = 'auto' | 'css' | 'js';

export interface MasonryOptions<T> {
  layoutMode?: LayoutMode;
  gutter?: number;
  minColWidth?: number;
  animate?: boolean;
  transitionDuration?: number;
  items: T[];
  renderItem: (item: T) => HTMLElement;
}