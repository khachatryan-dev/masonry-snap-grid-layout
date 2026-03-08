import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MasonrySnapGrid from '../src/react/MasonrySnapGrid';

type Item = { id: number; title: string; height: number };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, title: `Item ${i}`, height: 100 + i * 20 }));

const renderItem = (item: Item) => (
  <div style={{ height: item.height }} data-testid={`item-${item.id}`}>
    {item.title}
  </div>
);

// Fixed-height renderItem for predictable virtualization tests.
// setup.ts: offsetHeight = parseInt(style.height) || 200.
// With height=200 every item is 200px tall, giving a uniform 3-column grid:
//   container=800px, minColWidth=250px, gutter=16px → 3 cols
//   each row: 200px height + 16px gutter = 216px step
//   row y positions: 0, 216, 432, 648, 864, 1080, …
const renderFixedItem = (item: Item) => (
  <div style={{ height: 200 }} data-testid={`item-${item.id}`}>
    {item.title}
  </div>
);

// ── Rendering ────────────────────────────────────────────────────────────────

describe('MasonrySnapGrid rendering', () => {
  it('renders without crashing', () => {
    render(<MasonrySnapGrid items={[]} renderItem={renderItem} />);
  });

  it('renders all items', () => {
    render(<MasonrySnapGrid items={makeItems(4)} renderItem={renderItem} />);
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
  });

  it('renders SSR class before hydration', () => {
    const { container } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />
    );
    const root = container.firstElementChild as HTMLElement;
    // Before useEffect: should have SSR class
    expect(root.className).toContain('msgl-container');
  });

  it('switches to JS mode class after mount', async () => {
    const { container } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} layoutMode="js" />
    );
    const root = container.firstElementChild as HTMLElement;
    await act(async () => {});
    expect(root.className).toContain('msgl-container--js');
  });

  it('applies custom className to container', () => {
    const { container } = render(
      <MasonrySnapGrid items={makeItems(2)} renderItem={renderItem} className="my-grid" />
    );
    expect(container.firstElementChild?.className).toContain('my-grid');
  });

  it('applies custom style to container', () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(2)}
        renderItem={renderItem}
        style={{ background: 'red' }}
      />
    );
    expect((container.firstElementChild as HTMLElement).style.background).toBe('red');
  });
});

// ── Default props ─────────────────────────────────────────────────────────────

describe('MasonrySnapGrid defaults', () => {
  it('uses gutter=16 by default (sets CSS custom property)', async () => {
    const { container } = render(
      <MasonrySnapGrid items={makeItems(2)} renderItem={renderItem} />
    );
    await act(async () => {});
    const root = container.firstElementChild as HTMLElement;
    // --msgl-transition-duration should be set
    expect(root.style.getPropertyValue('--msgl-transition-duration')).toBe('400ms');
  });
});

// ── Layout mode ───────────────────────────────────────────────────────────────

describe('MasonrySnapGrid layoutMode', () => {
  it('uses CSS masonry class when layoutMode="auto" and browser supports it', async () => {
    const originalSupports = CSS.supports;
    CSS.supports = vi.fn().mockReturnValue(true);

    const { container } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} layoutMode="auto" />
    );
    await act(async () => {});
    expect(container.firstElementChild?.className).toContain('msgl-container--css');

    CSS.supports = originalSupports;
  });

  it('forces JS mode when layoutMode="js"', async () => {
    const { container } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} layoutMode="js" />
    );
    await act(async () => {});
    expect(container.firstElementChild?.className).toContain('msgl-container--js');
    expect(container.firstElementChild?.className).not.toContain('msgl-container--css');
  });
});

// ── Items update ──────────────────────────────────────────────────────────────

describe('MasonrySnapGrid items update', () => {
  it('renders updated items when prop changes', async () => {
    const { rerender } = render(
      <MasonrySnapGrid items={makeItems(2)} renderItem={renderItem} />
    );
    await act(async () => {});

    rerender(<MasonrySnapGrid items={makeItems(5)} renderItem={renderItem} />);
    await act(async () => {});

    expect(screen.getByTestId('item-4')).toBeInTheDocument();
  });

  it('removes items when array shrinks', async () => {
    const { rerender } = render(
      <MasonrySnapGrid items={makeItems(4)} renderItem={renderItem} />
    );
    await act(async () => {});

    rerender(<MasonrySnapGrid items={makeItems(2)} renderItem={renderItem} />);
    await act(async () => {});

    expect(screen.queryByTestId('item-3')).not.toBeInTheDocument();
  });
});

// ── ResizeObserver ─────────────────────────────────────────────────────────────

describe('MasonrySnapGrid ResizeObserver', () => {
  it('observes and disconnects ResizeObserver on unmount', async () => {
    const disconnectSpy = vi.fn();
    const observeSpy = vi.fn();
    const OriginalResizeObserver = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      observe = observeSpy;
      disconnect = disconnectSpy;
    } as unknown as typeof ResizeObserver;

    const { unmount } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} layoutMode="js" />
    );
    await act(async () => {});

    expect(observeSpy).toHaveBeenCalled();
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();

    globalThis.ResizeObserver = OriginalResizeObserver;
  });
});

// ── SSR-like render (no window/effects) ──────────────────────────────────────

describe('MasonrySnapGrid SSR output', () => {
  it('renders item content in initial HTML', () => {
    const { container } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />
    );
    // Content should be in the DOM regardless of layout state
    expect(container.textContent).toContain('Item 0');
    expect(container.textContent).toContain('Item 2');
  });
});

// ── Virtualization ────────────────────────────────────────────────────────────
//
// Layout geometry (jsdom defaults):
//   container offsetWidth = 800px  (setup.ts: parseInt(style.width) || 800)
//   item offsetHeight     = 200px  (renderFixedItem sets style.height=200)
//   gutter = 16px, minColWidth = 250px
//   cols = floor((800+16)/(250+16)) = 3
//   colWidth = (800 - 16*2) / 3 ≈ 256px
//   row y positions: 0, 216, 432, 648, 864, 1080, …
//
// jsdom scroll/viewport defaults:
//   window.innerHeight = 768, window.scrollY = 0
//   getBoundingClientRect().top = 0  → containerAbsTop = 0
//   With overscan=300:
//     relStart = 0 - 0 - 300 = -300
//     relEnd   = 0 - 0 + 768 + 300 = 1068
//
// 18 items → 6 rows.  Row 5 starts at y=1080 > relEnd(1068) → items 15-17 NOT visible.
// Items 0-14 (rows 0-4, y ≤ 864) are within relEnd → visible.

describe('MasonrySnapGrid virtualization', () => {
  const TOTAL = 18; // 6 rows × 3 cols
  const VISIBLE = 15; // rows 0-4 (y=0..864 ≤ 1068)

  afterEach(() => {
    // Restore scrollY after any test that changes it
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it('includes all items in server-rendered HTML (pre-measurement SSR pass)', () => {
    // renderToString runs the component without useEffect — this is the true SSR output.
    // isMounted=false and isMeasured=false → visibleIndices=null → all items rendered.
    const html = renderToString(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
      />
    );
    for (let i = 0; i < TOTAL; i++) {
      expect(html).toContain(`item-${i}`);
    }
  });

  it('removes items outside the viewport after measurement completes', async () => {
    render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={300}
      />
    );
    await act(async () => {});

    // Items in rows 0-4 (y = 0..864) should be in the DOM
    for (let i = 0; i < VISIBLE; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }
    // Items in row 5 (y = 1080 > relEnd 1068) should be removed
    for (let i = VISIBLE; i < TOTAL; i++) {
      expect(screen.queryByTestId(`item-${i}`)).not.toBeInTheDocument();
    }
  });

  it('preserves the full container height even when items are virtualized', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
      />
    );
    await act(async () => {});

    const root = container.firstElementChild as HTMLElement;
    // 6 rows × 200px + 5 gaps × 16px = 1280px  (trailing gap is subtracted)
    const height = parseInt(root.style.height, 10);
    expect(height).toBe(1280);
  });

  it('does not virtualize items when virtualize=false (default)', async () => {
    render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
      />
    );
    await act(async () => {});

    for (let i = 0; i < TOTAL; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }
  });

  // it('brings virtualized items into the DOM when they scroll into view', async () => {
  //   render(
  //     <MasonrySnapGrid
  //       items={makeItems(TOTAL)}
  //       renderItem={renderFixedItem}
  //       layoutMode="js"
  //       virtualize
  //       overscan={0}
  //     />
  //   );
  //   await act(async () => {});
  //
  //   // row 5 (y=1080) should be hidden at scrollY=0
  //   expect(screen.queryByTestId('item-15')).not.toBeInTheDocument();
  //
  //   // Scroll down so row 5 (y=1080) is inside the viewport
  //   // relStart = 1080 - 0 - 0 = 1080,  relEnd = 1080 + 768 = 1848
  //   // item-15 y=1080: 1080+200=1280 >= 1080 ✓  AND  1080 <= 1848 ✓
  //   Object.defineProperty(window, 'scrollY', { value: 1080, writable: true, configurable: true });
  //   await act(async () => {
  //     window.dispatchEvent(new Event('scroll'));
  //   });
  //
  //   expect(screen.getByTestId('item-15')).toBeInTheDocument();
  //   expect(screen.getByTestId('item-16')).toBeInTheDocument();
  //   expect(screen.getByTestId('item-17')).toBeInTheDocument();
  // });

  // it('removes items that scroll above the viewport + overscan', async () => {
  //   render(
  //     <MasonrySnapGrid
  //       items={makeItems(TOTAL)}
  //       renderItem={renderFixedItem}
  //       layoutMode="js"
  //       virtualize
  //       overscan={0}
  //     />
  //   );
  //   await act(async () => {});
  //
  //   // At scrollY=0 with overscan=0, row 0 items (y=0, height=200) ARE visible:
  //   //   relStart=0, pos.y+height=200 >= 0 ✓
  //   expect(screen.getByTestId('item-0')).toBeInTheDocument();
  //
  //   // Scroll past row 0: relStart = 300, item-0 bottom = 200 < 300 → hidden
  //   Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
  //   await act(async () => {
  //     window.dispatchEvent(new Event('scroll'));
  //   });
  //
  //   expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('item-2')).not.toBeInTheDocument();
  //
  //   // Row 1 items (y=216, height=200) should still be visible:
  //   //   216+200=416 >= 300 ✓
  //   expect(screen.getByTestId('item-3')).toBeInTheDocument();
  // });

  it('re-measures all items when new items are added', async () => {
    const { rerender } = render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={300}
      />
    );
    await act(async () => {});

    // Items 15-17 are outside viewport
    expect(screen.queryByTestId(`item-${TOTAL - 1}`)).not.toBeInTheDocument();

    // Add 3 more items (now 21 items, 7 rows)
    rerender(
      <MasonrySnapGrid
        items={makeItems(TOTAL + 3)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={300}
      />
    );
    await act(async () => {});

    // After re-measurement, visible items remain visible
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    // 21 items → 7 rows. Rows 5 (y=1080) and 6 (y=1296) are both > relEnd=1068.
    // item-18 is row 6 (y=1296 > 1068) → should NOT be in DOM.
    expect(screen.queryByTestId(`item-${TOTAL}`)).not.toBeInTheDocument();
  });

  it('server-rendered HTML contains all items even with virtualize=true (SSR/SEO)', () => {
    // SSR output (no effects, no client JS) must contain all items for crawlers.
    const html = renderToString(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
      />
    );
    expect(html).toContain('Item 0');
    expect(html).toContain(`Item ${TOTAL - 1}`);
  });

  it('does not activate virtualization in CSS masonry mode', async () => {
    const originalSupports = CSS.supports;
    CSS.supports = vi.fn().mockReturnValue(true);

    render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="auto"
        virtualize
      />
    );
    await act(async () => {});

    // All items should be in DOM — CSS masonry is handled by the browser
    for (let i = 0; i < TOTAL; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }

    CSS.supports = originalSupports;
  });

  it('reaches a stable DOM state (no infinite re-rendering loop)', async () => {
    render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={300}
      />
    );

    await act(async () => {});
    // Capture which items are in DOM after first settle
    const afterFirst = screen.queryAllByTestId(/^item-/).length;

    // Wait another tick — a correct implementation is stable; no more updates fire
    await act(async () => {});
    const afterSecond = screen.queryAllByTestId(/^item-/).length;

    expect(afterFirst).toBe(afterSecond);
    expect(afterFirst).toBeLessThan(TOTAL); // virtualization is active
    expect(afterFirst).toBeGreaterThan(0);
  });

  it('respects a custom overscan value', async () => {
    // overscan=0: only items strictly within 0..768 should be visible.
    // Row 4 starts at y=864 > 768 but overscan=0, so 864 <= 768 is false → hidden.
    render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={0}
      />
    );
    await act(async () => {});

    // Row 3 (y=648): 648+200=848 >= 0 ✓  AND  648 <= 768 ✓ → visible
    expect(screen.getByTestId('item-9')).toBeInTheDocument();

    // Row 4 (y=864): 864 <= 768 is false → NOT visible
    expect(screen.queryByTestId('item-12')).not.toBeInTheDocument();
    expect(screen.queryByTestId('item-13')).not.toBeInTheDocument();
    expect(screen.queryByTestId('item-14')).not.toBeInTheDocument();
  });
});
