import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MasonrySnapGrid from '../src/react/MasonrySnapGrid';

type Item = { id: number; title: string; height: number };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, title: `Item ${i}`, height: 100 + i * 20 }));

const renderItem = (item: Item) => (
  <div style={{ height: item.height }} data-testid={`item-${item.id}`}>
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
  it('uses CSS mode class when layoutMode="css"', async () => {
    // Mock CSS.supports to return true for masonry
    const originalSupports = CSS.supports;
    CSS.supports = vi.fn().mockReturnValue(true);

    const { container } = render(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} layoutMode="css" />
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
