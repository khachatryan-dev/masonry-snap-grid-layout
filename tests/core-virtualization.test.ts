import { describe, it, expect } from "vitest";
import {
  canVirtualize,
  computeVisibleIndices,
} from "../src/core/model/virtualization";
import { computeLayout } from "../src/core/model/layout";
import type { ScrollState } from "../src/core/lib/scroll";

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

describe("computeVisibleIndices", () => {
  it("shows only rows intersecting the viewport at the top of the grid", () => {
    // Window is [0, 768]; rows 0-3 start at 0/216/432/648 and all intersect.
    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({}),
      overscan: 0,
    });
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3]);
  });

  it("extends the window by the overscan buffer", () => {
    // Overscan 300 pushes the end to 1068, pulling in row 4 (y=864).
    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({}),
      overscan: 300,
    });
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3, 4]);
  });

  it("drops rows that have scrolled above the window", () => {
    // Scrolled to 300: row 0 ends at 200 < 300, so it falls out.
    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 300 }),
      overscan: 0,
    });
    expect(visible.has(0)).toBe(false);
    expect(visible.has(3)).toBe(true); // row 1 ends at 416 >= 300
  });

  it("brings later rows in as the page scrolls down", () => {
    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 1080 }),
      overscan: 0,
    });
    expect(visible.has(15)).toBe(true);
    expect(visible.has(17)).toBe(true);
  });

  it("subtracts containerOffset so a grid lower down the page is correct", () => {
    // Grid starts 1000px down the document. Scrolling to exactly 1000 should
    // look identical to scrolling to 0 on a grid at the very top.
    const atTop = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({}),
      overscan: 0,
    });
    const offsetGrid = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 1000, containerOffset: 1000 }),
      overscan: 0,
    });
    expect([...offsetGrid].sort()).toEqual([...atTop].sort());
  });

  it("includes an item straddling the window edge", () => {
    // Row 3 spans 648..848; a window ending at 700 must still include it.
    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ viewportSize: 700 }),
      overscan: 0,
    });
    expect(visible.has(9)).toBe(true);
  });

  it("uses fallbackHeight for unmeasured items", () => {
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
      count: 18,
      positions: estimated.positions,
      heights: [],
      scroll: scroll({}),
      overscan: 0,
      fallbackHeight: 200,
    });
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3]);
  });

  it("renders an item that has no position yet", () => {
    // The render that follows an append has more items than positions. Those
    // items must be mounted — not clipped against a position that is missing.
    const visible = computeVisibleIndices({
      count: 20,
      positions: GRID.positions, // only 18 entries
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 100000 }),
      overscan: 0,
    });
    expect(visible.has(18)).toBe(true);
    expect(visible.has(19)).toBe(true);
    // The placed items are still clipped normally.
    expect(visible.has(0)).toBe(false);
  });

  it("renders an unmeasured item when there is no estimate to stand in", () => {
    // An item that is never rendered is never measured, so clipping it on a
    // height of zero would strand it.
    const heights = [...HEIGHTS];
    delete heights[17];

    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights,
      scroll: scroll({ scrollOffset: 100000 }),
      overscan: 0,
    });
    expect(visible.has(17)).toBe(true);
    expect(visible.has(16)).toBe(false);
  });

  it("clips an unmeasured item once an estimate is supplied", () => {
    // This is what `estimatedItemHeight` buys: no render-everything pass.
    const heights = [...HEIGHTS];
    delete heights[17];

    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights,
      scroll: scroll({ scrollOffset: 100000 }),
      overscan: 0,
      fallbackHeight: 200,
    });
    expect(visible.has(17)).toBe(false);
  });

  it("keeps virtualizing the measured part of a partly measured list", () => {
    // The regression this guards: appending to a virtualized list used to turn
    // virtualization off wholesale, mounting every item in the list.
    const heights = [...HEIGHTS];
    for (let i = 15; i < 18; i++) delete heights[i];

    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights,
      scroll: scroll({}),
      overscan: 0,
    });

    // Rows 0-3 are on screen, row 4 is not, and the unmeasured row 5 is forced.
    expect(rowsPresent(visible)).toEqual([0, 1, 2, 3, 5]);
    expect(visible.size).toBeLessThan(18);
  });

  it("returns an empty set when scrolled far past the grid", () => {
    const visible = computeVisibleIndices({
      count: 18,
      positions: GRID.positions,
      heights: HEIGHTS,
      scroll: scroll({ scrollOffset: 100000 }),
      overscan: 0,
    });
    expect(visible.size).toBe(0);
  });
});

describe("canVirtualize", () => {
  it("is off when virtualize is disabled", () => {
    expect(canVirtualize({ virtualize: false, itemCount: 10 })).toBe(false);
  });

  it("is off for an empty list", () => {
    expect(canVirtualize({ virtualize: true, itemCount: 0 })).toBe(false);
  });

  it("is on for a non-empty list, regardless of measurement state", () => {
    // Measurement is no longer consulted here. Clipping an unmeasured item is
    // prevented per-item by computeVisibleIndices, so a partially measured
    // list stays virtualized instead of falling back to rendering everything.
    expect(canVirtualize({ virtualize: true, itemCount: 10 })).toBe(true);
  });
});
