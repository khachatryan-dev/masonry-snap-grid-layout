import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import MasonrySnapGrid from '../src/react/MasonrySnapGrid';
import {
  flushFrames,
  installMockResizeObserver,
  makePendingImage,
  mockRectGeometry,
  MockResizeObserver,
  setScrollY,
} from './setup';

type Item = { id: number; title: string; height: number };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
    height: 100 + i * 20,
  }));

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
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderItem}
        layoutMode="js"
      />
    );
    const root = container.firstElementChild as HTMLElement;
    await act(async () => {});
    expect(root.className).toContain('msgl-container--js');
  });

  it('applies custom className to container', () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(2)}
        renderItem={renderItem}
        className="my-grid"
      />
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
    expect((container.firstElementChild as HTMLElement).style.background).toBe(
      'red'
    );
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
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderItem}
        layoutMode="auto"
      />
    );
    await act(async () => {});
    expect(container.firstElementChild?.className).toContain('msgl-container--css');

    CSS.supports = originalSupports;
  });

  it('forces JS mode when layoutMode="js"', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderItem}
        layoutMode="js"
      />
    );
    await act(async () => {});
    expect(container.firstElementChild?.className).toContain('msgl-container--js');
    expect(container.firstElementChild?.className).not.toContain(
      'msgl-container--css'
    );
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
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderItem}
        layoutMode="js"
      />
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
    setScrollY(0);
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

  // The two tests below were previously disabled because they could not pass in
  // jsdom: `getBoundingClientRect()` is hard-coded to `top: 0`, so the
  // container's document offset was computed as `0 + window.scrollY`, which
  // tracked the scroll position and cancelled it out. The visible window then
  // never moved however far the page was scrolled. `mockRectGeometry` restores
  // browser-accurate geometry (a `top` that decreases as the page scrolls),
  // which is what makes these assertions meaningful.

  it('brings virtualized items into the DOM when they scroll into view', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={0}
      />
    );
    await act(async () => {});

    const root = container.firstElementChild as HTMLElement;
    mockRectGeometry(root, 0);

    // Row 5 starts at y=1080, below the 768px viewport.
    expect(screen.queryByTestId('item-15')).not.toBeInTheDocument();

    setScrollY(1080);
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      await flushFrames();
    });

    expect(screen.getByTestId('item-15')).toBeInTheDocument();
    expect(screen.getByTestId('item-16')).toBeInTheDocument();
    expect(screen.getByTestId('item-17')).toBeInTheDocument();
  });

  it('removes items that scroll above the viewport + overscan', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(TOTAL)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        overscan={0}
      />
    );
    await act(async () => {});

    const root = container.firstElementChild as HTMLElement;
    mockRectGeometry(root, 0);

    // Row 0 spans 0..200 and is visible at the top of the page.
    expect(screen.getByTestId('item-0')).toBeInTheDocument();

    // Scrolling to 300 puts row 0's bottom (200) above the window start.
    setScrollY(300);
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      await flushFrames();
    });

    expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('item-2')).not.toBeInTheDocument();

    // Row 1 spans 216..416, so it survives.
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
  });

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

// ── Explicit columns ──────────────────────────────────────────────────────────

describe('MasonrySnapGrid columns', () => {
  const xPositions = (container: HTMLElement): number[] => {
    const items = Array.from(container.querySelectorAll<HTMLElement>('.msgl-item'));
    const xs = items.map((el) => {
      const m = /translate\((\d+(?:\.\d+)?)px/.exec(el.style.transform);
      return m ? parseFloat(m[1]) : -1;
    });
    return [...new Set(xs)].sort((a, b) => a - b);
  };

  it('honours a fixed column count over minColWidth', async () => {
    // 800px would otherwise fit 3 columns of 250px.
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(6)}
        renderItem={renderFixedItem}
        layoutMode="js"
        columns={2}
      />
    );
    await act(async () => {});

    expect(xPositions(container)).toHaveLength(2);
  });

  it('sets column width from the explicit count', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(2)}
        renderItem={renderFixedItem}
        layoutMode="js"
        columns={2}
      />
    );
    await act(async () => {});

    const first = container.querySelector<HTMLElement>('.msgl-item');
    // (800 - 16) / 2
    expect(first?.style.width).toBe('392px');
  });

  it('resolves a breakpoint map against the container width', async () => {
    // Container measures 800px, so the 640 breakpoint applies -> 2 columns.
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(6)}
        renderItem={renderFixedItem}
        layoutMode="js"
        columns={{ 0: 1, 640: 2, 1200: 4 }}
      />
    );
    await act(async () => {});

    expect(xPositions(container)).toHaveLength(2);
  });

  it('lays out a single column at full width', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderFixedItem}
        layoutMode="js"
        columns={1}
      />
    );
    await act(async () => {});

    expect(xPositions(container)).toEqual([0]);
    expect(container.querySelector<HTMLElement>('.msgl-item')?.style.width).toBe(
      '800px'
    );
  });
});

// ── onLayout reporting ────────────────────────────────────────────────────────

describe('MasonrySnapGrid onLayout', () => {
  it('reports geometry after a layout pass', async () => {
    const onLayout = vi.fn();
    render(
      <MasonrySnapGrid
        items={makeItems(6)}
        renderItem={renderFixedItem}
        layoutMode="js"
        onLayout={onLayout}
      />
    );
    await act(async () => {});

    expect(onLayout).toHaveBeenCalled();
    const info = onLayout.mock.calls[onLayout.mock.calls.length - 1][0];
    expect(info).toMatchObject({
      columnCount: 3,
      columnWidth: 256,
      itemCount: 6,
      engine: 'js',
    });
    // 2 rows of 200px plus one 16px gutter.
    expect(info.containerHeight).toBe(416);
  });
});

// ── Item identity ─────────────────────────────────────────────────────────────

describe('MasonrySnapGrid getItemKey', () => {
  it('passes the index to renderItem', async () => {
    const spy = vi.fn((item: Item) => <div>{item.title}</div>);
    render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={spy} layoutMode="js" />
    );
    await act(async () => {});

    expect(spy.mock.calls.map((c) => c[1])).toEqual(
      expect.arrayContaining([0, 1, 2])
    );
  });

  it('keeps a DOM node attached to its item when the list is prepended to', async () => {
    // Without a stable key, position is the only identity available, so
    // prepending shifts every item into its neighbour's node — taking that
    // node's cached height with it.
    const items = makeItems(3);
    const { rerender } = render(
      <MasonrySnapGrid
        items={items}
        renderItem={renderFixedItem}
        layoutMode="js"
        getItemKey={(item) => item.id}
      />
    );
    await act(async () => {});

    const nodeBefore = screen.getByTestId('item-2');

    const prepended = [{ id: 99, title: 'Item 99', height: 100 }, ...items];
    rerender(
      <MasonrySnapGrid
        items={prepended}
        renderItem={renderFixedItem}
        layoutMode="js"
        getItemKey={(item) => item.id}
      />
    );
    await act(async () => {});

    // Same element instance: React moved it rather than rebuilding it.
    expect(screen.getByTestId('item-2')).toBe(nodeBefore);
  });

  it('reuses nodes by position when no key is supplied', async () => {
    // Documents the fallback so the difference from the keyed path is explicit.
    const items = makeItems(3);
    const { rerender } = render(
      <MasonrySnapGrid items={items} renderItem={renderFixedItem} layoutMode="js" />
    );
    await act(async () => {});

    const firstSlot = screen.getByTestId('item-0').parentElement;

    rerender(
      <MasonrySnapGrid
        items={[{ id: 99, title: 'Item 99', height: 100 }, ...items]}
        renderItem={renderFixedItem}
        layoutMode="js"
      />
    );
    await act(async () => {});

    // The wrapper at index 0 now holds a different item than before.
    expect(firstSlot).toBe(screen.getByTestId('item-99').parentElement);
  });
});

// ── Self-healing layout ───────────────────────────────────────────────────────

describe('MasonrySnapGrid self-healing measurement', () => {
  let restoreResizeObserver: () => void;

  beforeEach(() => {
    restoreResizeObserver = installMockResizeObserver();
  });

  afterEach(() => {
    restoreResizeObserver();
  });

  const renderImageItem = (item: Item) => (
    <div style={{ height: 200 }} data-testid={`item-${item.id}`}>
      <img alt="" />
    </div>
  );

  it('observes each item so content settling can trigger a relayout', async () => {
    render(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderFixedItem}
        layoutMode="js"
      />
    );
    await act(async () => {});

    // One observer watches the container, another watches the items.
    const watchingItems = MockResizeObserver.instances.some((o) =>
      [...o.observed].some((el) =>
        (el as HTMLElement).classList.contains('msgl-item')
      )
    );
    expect(watchingItems).toBe(true);
  });

  it('relayouts when an item resizes after first measurement', async () => {
    // The image-gallery failure: heights are measured before content settles,
    // and previously nothing but a container width change could correct them.
    const onLayout = vi.fn();
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderFixedItem}
        layoutMode="js"
        onLayout={onLayout}
      />
    );
    await act(async () => {});
    onLayout.mockClear();

    const item = container.querySelector<HTMLElement>('.msgl-item')!;
    const observer = MockResizeObserver.instances.find((o) =>
      o.observed.has(item)
    )!;

    await act(async () => {
      observer.emit([item]);
      await flushFrames();
    });

    expect(onLayout).toHaveBeenCalled();
  });

  it('does not observe items when observeItemResize is false', async () => {
    render(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderFixedItem}
        layoutMode="js"
        observeItemResize={false}
      />
    );
    await act(async () => {});

    const watchingItems = MockResizeObserver.instances.some((o) =>
      [...o.observed].some((el) =>
        (el as HTMLElement).classList.contains('msgl-item')
      )
    );
    expect(watchingItems).toBe(false);
  });

  it('relayouts when an image inside an item finishes loading', async () => {
    const onLayout = vi.fn();
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(2)}
        renderItem={renderImageItem}
        layoutMode="js"
        onLayout={onLayout}
      />
    );
    await act(async () => {});
    onLayout.mockClear();

    // jsdom reports images as already complete, so stand in a pending one.
    const wrapper = container.querySelector<HTMLElement>('.msgl-item')!;
    wrapper.querySelector('img')!.remove();
    const pending = makePendingImage();
    wrapper.appendChild(pending);

    // Re-observing picks up the newly pending image.
    const observer = MockResizeObserver.instances.find((o) =>
      o.observed.has(wrapper)
    )!;
    await act(async () => {
      observer.emit([wrapper]);
      await flushFrames();
    });

    expect(onLayout).toHaveBeenCalled();
  });

  it('tears down item observation on unmount', async () => {
    const { unmount } = render(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderFixedItem}
        layoutMode="js"
      />
    );
    await act(async () => {});

    unmount();

    const stillObserving = MockResizeObserver.instances.some(
      (o) => o.observed.size > 0
    );
    expect(stillObserving).toBe(false);
  });
});

// ── Virtualization inside a scroll container ──────────────────────────────────

describe('MasonrySnapGrid scrollContainer', () => {
  afterEach(() => setScrollY(0));

  /** A grid inside an `overflow: auto` panel, virtualizing against the panel. */
  function ScrollBoxGrid({ total }: { total: number }) {
    const boxRef = React.useRef<HTMLDivElement>(null);
    return (
      <div ref={boxRef} data-testid="scrollbox" style={{ overflow: 'auto' }}>
        <MasonrySnapGrid
          items={makeItems(total)}
          renderItem={renderFixedItem}
          layoutMode="js"
          virtualize
          overscan={0}
          scrollContainer={boxRef}
        />
      </div>
    );
  }

  it('virtualizes against an element rather than the page', async () => {
    // Page-scroll-only virtualization is inert inside a scrollable panel —
    // the window never scrolls, so nothing is ever clipped.
    const { getByTestId, container } = render(<ScrollBoxGrid total={18} />);

    const box = getByTestId('scrollbox');
    Object.defineProperty(box, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    box.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;

    const grid = container.querySelector<HTMLElement>('.msgl-container')!;
    grid.getBoundingClientRect = () => ({ top: -box.scrollTop }) as DOMRect;

    await act(async () => {
      box.dispatchEvent(new Event('scroll'));
      await flushFrames();
    });

    // A 400px panel shows rows 0-1 (y = 0, 216); row 2 starts at 432.
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.queryByTestId('item-17')).not.toBeInTheDocument();

    // Scroll the panel and later rows arrive.
    box.scrollTop = 1080;
    await act(async () => {
      box.dispatchEvent(new Event('scroll'));
      await flushFrames();
    });

    expect(screen.getByTestId('item-15')).toBeInTheDocument();
  });
});

// ── Estimated heights ─────────────────────────────────────────────────────────

describe('MasonrySnapGrid estimatedItemHeight', () => {
  afterEach(() => setScrollY(0));

  it('clips a large list while keeping the full scroll height', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(300)}
        renderItem={renderFixedItem}
        layoutMode="js"
        virtualize
        estimatedItemHeight={200}
        overscan={0}
      />
    );
    await act(async () => {});

    const root = container.firstElementChild as HTMLElement;
    const rendered = container.querySelectorAll('.msgl-item').length;

    expect(rendered).toBeLessThan(300);
    // 100 rows x 200px + 99 gutters x 16px
    expect(parseInt(root.style.height, 10)).toBe(21584);
  });
});

// ── Server rendering ──────────────────────────────────────────────────────────

describe('MasonrySnapGrid server rendering', () => {
  it('does not warn about useLayoutEffect during SSR', () => {
    // useLayoutEffect cannot run on the server, and React warns for every
    // component that schedules one — noisy in any Next.js or Nuxt build log.
    const errors: string[] = [];
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => {
        errors.push(String(args[0]));
      });

    renderToString(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />
    );

    spy.mockRestore();
    expect(errors.filter((e) => e.includes('useLayoutEffect'))).toEqual([]);
  });
});

// ── CSS masonry mode ──────────────────────────────────────────────────────────

describe('MasonrySnapGrid CSS masonry mode', () => {
  let originalCSS: typeof globalThis.CSS;

  beforeEach(() => {
    originalCSS = globalThis.CSS;
    globalThis.CSS = {
      supports: (property: string, value?: string) =>
        property === 'grid-template-rows' && value === 'masonry',
    } as unknown as typeof globalThis.CSS;
  });

  afterEach(() => {
    globalThis.CSS = originalCSS;
  });

  it('writes no transforms, since the browser positions items', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(4)}
        renderItem={renderFixedItem}
        layoutMode="auto"
      />
    );
    await act(async () => {});

    const item = container.querySelector<HTMLElement>('.msgl-item')!;
    expect(item.style.transform).toBe('');
    expect(item.style.position).toBe('');
  });

  it('writes an explicit track list when columns is a fixed number', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(6)}
        renderItem={renderFixedItem}
        layoutMode="auto"
        columns={2}
      />
    );
    await act(async () => {});

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('resolves a breakpoint map for the track list', async () => {
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(6)}
        renderItem={renderFixedItem}
        layoutMode="auto"
        columns={{ 0: 1, 640: 3 }}
      />
    );
    await act(async () => {});

    // The container measures 800px via the harness, so the 640 key wins.
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('does not observe individual items in CSS mode', async () => {
    const restore = installMockResizeObserver();
    try {
      const { container } = render(
        <MasonrySnapGrid
          items={makeItems(4)}
          renderItem={renderFixedItem}
          layoutMode="auto"
        />
      );
      await act(async () => {});

      const item = container.querySelector<HTMLElement>('.msgl-item')!;
      const watched = MockResizeObserver.instances.some((o) =>
        o.observed.has(item)
      );
      expect(watched).toBe(false);
    } finally {
      restore();
    }
  });

  it('sets no explicit container height in CSS mode', async () => {
    // The browser owns the grid's height; writing one would clip it.
    const { container } = render(
      <MasonrySnapGrid
        items={makeItems(9)}
        renderItem={renderFixedItem}
        layoutMode="auto"
      />
    );
    await act(async () => {});

    expect((container.firstElementChild as HTMLElement).style.height).toBe('');
  });
});
