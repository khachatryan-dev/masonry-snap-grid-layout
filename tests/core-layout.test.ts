import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/core/model/layout';
import {
  getColumnCount,
  resolveBreakpoints,
  resolveColumnCount,
} from '../src/core/model/columns';

// 800px container, 16px gutter, 250px min column -> 3 columns of 256px.
const BASE = { containerWidth: 800, gutter: 16, minColWidth: 250 };

describe('computeLayout', () => {
  it('derives column count and width from the container', () => {
    const r = computeLayout({ ...BASE, count: 0, heights: [] });
    expect(r.columnCount).toBe(3);
    expect(r.columnWidth).toBe(256);
  });

  it('fills the first row left to right', () => {
    const r = computeLayout({ ...BASE, count: 3, heights: [100, 100, 100] });
    expect(r.positions.map((p) => p.x)).toEqual([0, 272, 544]);
    expect(r.positions.map((p) => p.y)).toEqual([0, 0, 0]);
  });

  it('places each item in the shortest column', () => {
    // Column 1 stays shortest, so item 3 must land there.
    const r = computeLayout({ ...BASE, count: 4, heights: [300, 100, 200] });
    expect(r.positions[3].x).toBe(272);
    expect(r.positions[3].y).toBe(116); // 100 + 16 gutter
  });

  it('breaks ties toward the leftmost column', () => {
    const r = computeLayout({ ...BASE, count: 4, heights: [100, 100, 100] });
    expect(r.positions[3].x).toBe(0);
  });

  it('excludes the trailing gutter from container height', () => {
    // Tallest column holds one 200px item; no trailing gap should be counted.
    const r = computeLayout({ ...BASE, count: 3, heights: [200, 200, 200] });
    expect(r.containerHeight).toBe(200);
  });

  it('accumulates height across rows', () => {
    // 2 rows of 200px in every column: 200 + 16 + 200 = 416
    const r = computeLayout({
      ...BASE,
      count: 6,
      heights: [200, 200, 200, 200, 200, 200],
    });
    expect(r.containerHeight).toBe(416);
  });

  it('returns zero height for an empty grid', () => {
    const r = computeLayout({ ...BASE, count: 0, heights: [] });
    expect(r.containerHeight).toBe(0);
    expect(r.positions).toEqual([]);
  });

  it('never returns a negative container height', () => {
    const r = computeLayout({ ...BASE, count: 1, heights: [0] });
    expect(r.containerHeight).toBeGreaterThanOrEqual(0);
  });

  it('substitutes fallbackHeight for unmeasured items', () => {
    const r = computeLayout({
      ...BASE,
      count: 3,
      heights: [],
      fallbackHeight: 150,
    });
    // Each column gets one 150px item.
    expect(r.containerHeight).toBe(150);
  });

  it('prefers a real measured height over fallbackHeight', () => {
    const r = computeLayout({
      ...BASE,
      count: 1,
      heights: [400],
      fallbackHeight: 150,
    });
    expect(r.containerHeight).toBe(400);
  });

  it('treats a zero measured height as unmeasured', () => {
    const r = computeLayout({
      ...BASE,
      count: 1,
      heights: [0],
      fallbackHeight: 150,
    });
    expect(r.containerHeight).toBe(150);
  });

  it('honours an explicit column count over minColWidth', () => {
    const r = computeLayout({ ...BASE, count: 0, heights: [], columns: 2 });
    expect(r.columnCount).toBe(2);
    expect(r.columnWidth).toBe(392); // (800 - 16) / 2
  });

  it('lays out a single column with no horizontal offset', () => {
    const r = computeLayout({
      ...BASE,
      count: 3,
      heights: [100, 100, 100],
      columns: 1,
    });
    expect(r.positions.map((p) => p.x)).toEqual([0, 0, 0]);
    expect(r.positions.map((p) => p.y)).toEqual([0, 116, 232]);
    expect(r.columnWidth).toBe(800);
  });
});

describe('getColumnCount', () => {
  it('returns 1 for zero-width container', () => {
    expect(getColumnCount(0, 250, 16)).toBe(1);
  });

  it('returns 1 for negative-width container', () => {
    expect(getColumnCount(-100, 250, 16)).toBe(1);
  });

  it('calculates correct column count for standard widths', () => {
    expect(getColumnCount(800, 250, 16)).toBe(3);
    expect(getColumnCount(1200, 250, 16)).toBe(4);
  });
});

describe('resolveBreakpoints', () => {
  const map = { 0: 1, 640: 2, 1024: 3, 1440: 4 };

  it('picks the widest breakpoint at or below the container width', () => {
    expect(resolveBreakpoints(0, map)).toBe(1);
    expect(resolveBreakpoints(639, map)).toBe(1);
    expect(resolveBreakpoints(640, map)).toBe(2);
    expect(resolveBreakpoints(1023, map)).toBe(2);
    expect(resolveBreakpoints(1024, map)).toBe(3);
    expect(resolveBreakpoints(5000, map)).toBe(4);
  });

  it('falls back to the smallest breakpoint below the lowest key', () => {
    expect(resolveBreakpoints(100, { 640: 2, 1024: 3 })).toBe(2);
  });

  it('sorts keys numerically rather than by insertion order', () => {
    // Written deliberately out of order.
    expect(resolveBreakpoints(700, { 1024: 3, 0: 1, 640: 2 })).toBe(2);
  });

  it('returns null for an empty map', () => {
    expect(resolveBreakpoints(800, {})).toBeNull();
  });
});

describe('resolveColumnCount', () => {
  it('uses minColWidth when columns is absent', () => {
    expect(resolveColumnCount(800, { minColWidth: 250, gutter: 16 })).toBe(3);
  });

  it('uses a fixed columns number when provided', () => {
    expect(
      resolveColumnCount(800, { columns: 5, minColWidth: 250, gutter: 16 })
    ).toBe(5);
  });

  it('resolves a breakpoint map against the container width', () => {
    expect(
      resolveColumnCount(700, {
        columns: { 0: 1, 640: 2 },
        minColWidth: 250,
        gutter: 16,
      })
    ).toBe(2);
  });

  it('falls back to minColWidth for unusable columns values', () => {
    // A zero, negative, or NaN count would produce an unrenderable grid.
    expect(
      resolveColumnCount(800, { columns: 0, minColWidth: 250, gutter: 16 })
    ).toBe(3);
    expect(
      resolveColumnCount(800, { columns: -2, minColWidth: 250, gutter: 16 })
    ).toBe(3);
    expect(
      resolveColumnCount(800, { columns: NaN, minColWidth: 250, gutter: 16 })
    ).toBe(3);
    expect(
      resolveColumnCount(800, { columns: {}, minColWidth: 250, gutter: 16 })
    ).toBe(3);
  });

  it('floors fractional column counts', () => {
    expect(
      resolveColumnCount(800, { columns: 2.7, minColWidth: 250, gutter: 16 })
    ).toBe(2);
  });
});
