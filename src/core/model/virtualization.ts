import type { ItemPosition } from './layout';
import type { ScrollState } from './types';

export interface VisibleRangeParams {
  positions: ItemPosition[];
  /** Measured height per index; holes fall back to `fallbackHeight`. */
  heights: ArrayLike<number | undefined>;
  scroll: ScrollState;
  /** Extra pixels kept rendered above and below the viewport. */
  overscan: number;
  /** Height assumed for unmeasured items. Default: 0 */
  fallbackHeight?: number;
}

/**
 * Determine which item indices intersect the viewport, plus the overscan
 * buffer, in container-relative coordinates.
 *
 * Kept separate from any framework so React, Vue, and the vanilla engine
 * share identical visibility semantics.
 */
export function computeVisibleIndices(params: VisibleRangeParams): Set<number> {
  const { positions, heights, scroll, overscan, fallbackHeight = 0 } = params;

  // Translate the viewport into the container's own coordinate space.
  const origin = scroll.scrollOffset - scroll.containerOffset;
  const start = origin - overscan;
  const end = origin + scroll.viewportSize + overscan;

  const visible = new Set<number>();

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const h = heights[i];
    const itemH = typeof h === 'number' && h > 0 ? h : fallbackHeight;

    if (pos.y + itemH >= start && pos.y <= end) visible.add(i);
  }

  return visible;
}

/**
 * Decide whether virtualization may take effect yet.
 *
 * Virtualization must not clip items while their heights are still unknown, or
 * the layout would be computed from zeros. Supplying `estimatedItemHeight`
 * provides that missing height up front, which lets large lists skip the
 * render-everything measurement pass entirely.
 */
export function canVirtualize(options: {
  virtualize: boolean;
  isMeasured: boolean;
  hasEstimate: boolean;
  itemCount: number;
}): boolean {
  const { virtualize, isMeasured, hasEstimate, itemCount } = options;
  if (!virtualize || itemCount === 0) return false;
  return isMeasured || hasEstimate;
}
