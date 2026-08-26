import { resolveColumnCount, type ColumnsOption } from './columns';

/** Resolved position of a single item within the grid. */
export interface ItemPosition {
  x: number;
  y: number;
  width: number;
}

/** Full result of a layout pass. */
export interface LayoutResult {
  positions: ItemPosition[];
  /** Content height of the tallest column, excluding the trailing gutter. */
  containerHeight: number;
  columnCount: number;
  columnWidth: number;
}

export interface ComputeLayoutParams {
  /** Number of items to place. */
  count: number;
  /** Measured height per index. Holes are filled with `fallbackHeight`. */
  heights: ArrayLike<number | undefined>;
  containerWidth: number;
  gutter: number;
  minColWidth: number;
  /** Fixed count or breakpoint map; overrides `minColWidth` when set. */
  columns?: ColumnsOption;
  /** Height assumed for not-yet-measured items. Default: 0 */
  fallbackHeight?: number;
}

/**
 * Compute masonry positions using shortest-column-first placement.
 *
 * This is the single source of truth for the layout algorithm — the vanilla
 * engine and every framework adapter call it, so a fix here fixes all of them.
 * It is pure: no DOM reads, no DOM writes, fully unit-testable.
 *
 * Ties are broken toward the leftmost column, which keeps placement stable and
 * visually top-left weighted.
 */
export function computeLayout(params: ComputeLayoutParams): LayoutResult {
  const {
    count,
    heights,
    containerWidth,
    gutter,
    minColWidth,
    columns,
    fallbackHeight = 0,
  } = params;

  const columnCount = resolveColumnCount(containerWidth, {
    columns,
    minColWidth,
    gutter,
  });

  const columnWidth = (containerWidth - gutter * (columnCount - 1)) / columnCount;

  const colHeights = new Array<number>(columnCount).fill(0);
  const positions: ItemPosition[] = [];

  for (let i = 0; i < count; i++) {
    // Shortest column, leftmost on a tie.
    let col = 0;
    let minH = colHeights[0];
    for (let c = 1; c < columnCount; c++) {
      if (colHeights[c] < minH) {
        minH = colHeights[c];
        col = c;
      }
    }

    positions.push({
      x: col * (columnWidth + gutter),
      y: colHeights[col],
      width: columnWidth,
    });

    const h = heights[i];
    colHeights[col] +=
      (typeof h === 'number' && h > 0 ? h : fallbackHeight) + gutter;
  }

  // Subtract the trailing gutter to get true content height.
  const containerHeight =
    count > 0 ? Math.max(0, Math.max(...colHeights) - gutter) : 0;

  return { positions, containerHeight, columnCount, columnWidth };
}
