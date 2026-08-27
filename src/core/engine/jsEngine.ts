import { computeLayout, type LayoutResult } from '../model/layout';
import type { ColumnsOption } from '../model/columns';

export interface ApplyLayoutExtras {
  /** Fixed column count or breakpoint map; overrides `minColWidth`. */
  columns?: ColumnsOption;
  /** Height assumed for items that measure as zero. */
  estimatedItemHeight?: number;
}

/**
 * Apply JS-powered masonry layout using absolute positioning and CSS transforms.
 *
 * Placement itself is delegated to {@link computeLayout} so the vanilla engine
 * and the framework adapters cannot drift apart.
 *
 * DOM access is strictly phased to avoid layout thrashing:
 *   1. write every width (one style recalc is now pending)
 *   2. read every height (one forced reflow, amortised across all items)
 *   3. write every transform (no reads follow, so nothing is invalidated)
 *
 * @returns the computed layout, or `null` if the container has no width yet.
 */
export function applyMasonryLayout(
  container: HTMLElement,
  items: HTMLElement[],
  minColWidth: number,
  gutter: number,
  animate: boolean,
  duration: number,
  extras: ApplyLayoutExtras = {}
): LayoutResult | null {
  const containerWidth = container.clientWidth;
  if (containerWidth <= 0) return null;

  const { positions, containerHeight, columnCount, columnWidth } = (() => {
    // Phase 1 — write widths so content reflows to its final dimensions.
    const preliminary = computeLayout({
      count: items.length,
      heights: [],
      containerWidth,
      gutter,
      minColWidth,
      columns: extras.columns,
    });

    items.forEach((item) => {
      item.style.position = 'absolute';
      item.style.width = `${preliminary.columnWidth}px`;
      item.style.transition = animate ? `transform ${duration}ms ease` : '';
    });

    // Phase 2 — read every height in one pass, now that widths are correct.
    const heights = items.map((item) => item.offsetHeight);

    // Phase 3 — compute final placement from real measurements.
    return computeLayout({
      count: items.length,
      heights,
      containerWidth,
      gutter,
      minColWidth,
      columns: extras.columns,
      fallbackHeight: extras.estimatedItemHeight ?? 0,
    });
  })();

  items.forEach((item, i) => {
    const pos = positions[i];
    if (!pos) return;
    item.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  });

  container.style.position = 'relative';
  container.style.height = `${containerHeight}px`;

  return { positions, containerHeight, columnCount, columnWidth };
}

/**
 * Remove all JS masonry inline styles from the container and its items.
 */
export function removeMasonryLayout(
  container: HTMLElement,
  items: HTMLElement[]
): void {
  items.forEach((item) => {
    item.style.position = '';
    item.style.width = '';
    item.style.transform = '';
    item.style.transition = '';
  });
  container.style.position = '';
  container.style.height = '';
}
