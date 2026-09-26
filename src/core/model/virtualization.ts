import type { ItemPosition } from "./layout";
import type { ScrollState } from "./types";

export interface VisibleRangeParams {
  /**
   * Number of items in the list.
   *
   * Passed separately because `positions` lags behind during the render that
   * follows an items change — the new items exist but have not been placed
   * yet, and they still have to be accounted for.
   */
  count: number;
  /** Placement per index. Entries may be missing while a layout pass is pending. */
  positions: ArrayLike<ItemPosition | undefined>;
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
 *
 * Two kinds of item are reported visible regardless of geometry, because
 * mounting them is the only way to learn what they are:
 *
 * - **Unplaced** — the item list grew and the layout pass has not run yet.
 * - **Unmeasured, with no estimate** — there is no height to test against, and
 *   an item that is never rendered is never measured.
 *
 * This is what keeps appending cheap. The previous design switched
 * virtualization off wholesale whenever anything was unmeasured, so adding one
 * item to a list of 5,000 re-rendered all 5,001. Now only the genuinely
 * unknown items are forced out, and supplying `estimatedItemHeight` removes
 * even those.
 */
export function computeVisibleIndices(params: VisibleRangeParams): Set<number> {
  const {
    count,
    positions,
    heights,
    scroll,
    overscan,
    fallbackHeight = 0,
  } = params;

  // Translate the viewport into the container's own coordinate space.
  const origin = scroll.scrollOffset - scroll.containerOffset;
  const start = origin - overscan;
  const end = origin + scroll.viewportSize + overscan;

  const visible = new Set<number>();

  for (let i = 0; i < count; i++) {
    const pos = positions[i];
    const h = heights[i];
    const measured = typeof h === "number" && h > 0;

    if (!pos || (!measured && fallbackHeight <= 0)) {
      visible.add(i);
      continue;
    }

    const itemH = measured ? h : fallbackHeight;
    if (pos.y + itemH >= start && pos.y <= end) visible.add(i);
  }

  return visible;
}

/**
 * Decide whether virtualization may take effect.
 *
 * Measurement state is deliberately not consulted: clipping an unmeasured item
 * is prevented per-item by {@link computeVisibleIndices}, which is what lets a
 * partially measured list stay virtualized instead of falling back to
 * rendering everything.
 */
export function canVirtualize(options: {
  virtualize: boolean;
  itemCount: number;
}): boolean {
  return options.virtualize && options.itemCount > 0;
}
