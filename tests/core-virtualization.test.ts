import { describe, it, expect } from 'vitest';
import {
  canVirtualize,
  computeVisibleIndices,
} from '../src/core/model/virtualization';
import { computeLayout } from '../src/core/model/layout';
import type { ScrollState } from '../src/core/lib/scroll';

// 6 rows x 3 columns of 200px items with a 16px gutter.
// Row tops: 0, 216, 432, 648, 864, 1080
const GRID = computeLayout({
  count: 18,
  heights: new Array(18).fill(200),
  containerWidth: 800,
  gutter: 16,
  minColWidth: 250,
});

const HEIGHTS = new Array(18).fill(200);

const scroll = (partial: Partial<ScrollState>): ScrollState => ({
  scrollOffset: 0,
  viewportSize: 768,
  containerOffset: 0,
  ...partial,
});

const rowOf = (i: number) => Math.floor(i / 3);
const rowsPresent = (visible: Set<number>) =>
  [...new Set([...visible].map(rowOf))].sort((a, b) => a - b);

describe('computeVisibleIndices', () => {
  it('shows only rows intersecting the viewport at the top of the grid', () => {
    // Window is [0, 768]; rows 0-3 start at 0/216/432/648 and all intersect.
    const visible = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({}),
      overscan: 0,
    });
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3]);
  });

  it('extends the window by the overscan buffer', () => {
    // Overscan 300 pushes the end to 1068, pulling in row 4 (y=864).
    const visible = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({}),
      overscan: 300,
    });
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3, 4]);
  });

  it('drops rows that have scrolled above the window', () => {
    // Scrolled to 300: row 0 ends at 200 < 300, so it falls out.
    const visible = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 300 }),
      overscan: 0,
    });
    expect(visible.has(0)).toBe(false);
    expect(visible.has(3)).toBe(true); // row 1 ends at 416 >= 300
  });

  it('brings later rows in as the page scrolls down', () => {
    const visible = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 1080 }),
      overscan: 0,
    });
    expect(visible.has(15)).toBe(true);
    expect(visible.has(17)).toBe(true);
  });

  it('subtracts containerOffset so a grid lower down the page is correct', () => {
    // Grid starts 1000px down the document. Scrolling to exactly 1000 should
    // look identical to scrolling to 0 on a grid at the very top.
    const atTop = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({}),
      overscan: 0,
    });
    const offsetGrid = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 1000, containerOffset: 1000 }),
      overscan: 0,
    });
    expect([...offsetGrid].sort()).toEqual([...atTop].sort());
  });

  it('includes an item straddling the window edge', () => {
    // Row 3 spans 648..848; a window ending at 700 must still include it.
    const visible = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ viewportSize: 700 }),
      overscan: 0,
    });
    expect(visible.has(9)).toBe(true);
  });

  it('uses fallbackHeight for unmeasured items', () => {
    // With no measured heights, every item sits at y=0 unless a fallback gives
    // them extent — so a fallback is what makes later rows exist at all.
    const estimated = computeLayout({
      count: 18,
      heights: [],
      containerWidth: 800,
      gutter: 16,
      minColWidth: 250,
      fallbackHeight: 200,
    });

    const visible = computeVisibleIndices({
      positions: estimated.positions,
      heights: [],
      scroll: scroll({}),
      overscan: 0,
      fallbackHeight: 200,
    });
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3]);
  });

  it('returns an empty set when scrolled far past the grid', () => {
    const visible = computeVisibleIndices({
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 100000 }),
      overscan: 0,
    });
    expect(visible.size).toBe(0);
  });
});

describe('canVirtualize', () => {
  const base = {
    virtualize: true,
    isMeasured: false,
    hasEstimate: false,
    itemCount: 10,
  };

  it('is off when virtualize is disabled', () => {
    expect(canVirtualize({ ...base, virtualize: false, isMeasured: true })).toBe(
      false
    );
  });

  it('is off before measurement when no estimate is supplied', () => {
    // Clipping items whose heights are still unknown would lay out from zeros.
    expect(canVirtualize(base)).toBe(false);
  });

  it('is on once every item is measured', () => {
    expect(canVirtualize({ ...base, isMeasured: true })).toBe(true);
  });

  it('is on immediately when an estimate is supplied', () => {
    // This is what lets very large lists skip the render-everything pass.
    expect(canVirtualize({ ...base, hasEstimate: true })).toBe(true);
  });

  it('is off for an empty list', () => {
    expect(canVirtualize({ ...base, isMeasured: true, itemCount: 0 })).toBe(false);
  });
});
