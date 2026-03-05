import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getColumnCount, supportsCss } from '../src/core/utils';
import { applyMasonryLayout, removeMasonryLayout } from '../src/core/layoutEngine';
import { applyCssMasonry, removeCssMasonry } from '../src/core/cssEngine';
import MasonrySnapGridLayout from '../src/core/MasonrySnapGridLayout';

// ── Utility functions ────────────────────────────────────────────────────────

describe('getColumnCount', () => {
  it('returns 1 for zero-width container', () => {
    expect(getColumnCount(0, 250, 16)).toBe(1);
  });

  it('returns 1 for negative-width container', () => {
    expect(getColumnCount(-100, 250, 16)).toBe(1);
  });

  it('returns 1 when container is too narrow for 2 columns', () => {
    expect(getColumnCount(250, 250, 16)).toBe(1);
  });

  it('calculates correct column count for standard widths', () => {
    // (1200 + 16) / (250 + 16) = 1216 / 266 ≈ 4.57 → 4
    expect(getColumnCount(1200, 250, 16)).toBe(4);
  });

  it('returns 1 when minColWidth equals container width', () => {
    expect(getColumnCount(300, 300, 16)).toBe(1);
  });

  it('handles zero gutter', () => {
    // 1000 / 250 = 4
    expect(getColumnCount(1000, 250, 0)).toBe(4);
  });
});

describe('supportsCss', () => {
  it('returns false when CSS is not defined', () => {
    const original = globalThis.CSS;
    // @ts-expect-error intentional
    delete globalThis.CSS;
    expect(supportsCss('display', 'grid')).toBe(false);
    globalThis.CSS = original;
  });

  it('returns false without throwing on invalid property', () => {
    expect(supportsCss('not-a-real-property', 'not-a-value')).toBe(false);
  });
});

// ── JS Layout engine ─────────────────────────────────────────────────────────

describe('applyMasonryLayout', () => {
  let container: HTMLDivElement;
  let items: HTMLDivElement[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    items = [1, 2, 3].map(() => {
      const el = document.createElement('div');
      container.appendChild(el);
      return el;
    });
  });

  it('does not apply layout when container width is 0', () => {
    Object.defineProperty(container, 'clientWidth', { value: 0, configurable: true });
    applyMasonryLayout(container, items, 250, 16, false, 400);
    expect(container.style.height).toBe('');
  });

  it('positions items with absolute and transform styles', () => {
    applyMasonryLayout(container, items, 250, 16, false, 400);
    items.forEach((item) => {
      expect(item.style.position).toBe('absolute');
      expect(item.style.transform).toMatch(/translate\(/);
    });
  });

  it('sets container position to relative', () => {
    applyMasonryLayout(container, items, 250, 16, false, 400);
    expect(container.style.position).toBe('relative');
  });

  it('sets container height to a positive number', () => {
    applyMasonryLayout(container, items, 250, 16, false, 400);
    const height = parseFloat(container.style.height);
    expect(height).toBeGreaterThan(0);
  });

  it('applies transition when animate is true', () => {
    applyMasonryLayout(container, items, 250, 16, true, 300);
    items.forEach((item) => {
      expect(item.style.transition).toContain('300ms');
    });
  });

  it('clears transition when animate is false', () => {
    applyMasonryLayout(container, items, 250, 16, false, 400);
    items.forEach((item) => {
      expect(item.style.transition).toBe('');
    });
  });

  it('handles empty items array', () => {
    applyMasonryLayout(container, [], 250, 16, false, 400);
    expect(container.style.height).toBe('0px');
  });
});

describe('removeMasonryLayout', () => {
  it('clears inline styles from container and items', () => {
    const container = document.createElement('div');
    const item = document.createElement('div');
    container.style.position = 'relative';
    container.style.height = '500px';
    item.style.position = 'absolute';
    item.style.transform = 'translate(10px, 20px)';

    removeMasonryLayout(container, [item]);

    expect(container.style.position).toBe('');
    expect(container.style.height).toBe('');
    expect(item.style.position).toBe('');
    expect(item.style.transform).toBe('');
  });
});

// ── CSS engine ───────────────────────────────────────────────────────────────

describe('applyCssMasonry', () => {
  it('sets display grid and grid properties', () => {
    const container = document.createElement('div');
    applyCssMasonry(container, 16, 250);
    expect(container.style.display).toBe('grid');
    expect(container.style.gap).toBe('16px');
    expect(container.style.gridTemplateColumns).toContain('250px');
  });
});

describe('removeCssMasonry', () => {
  it('clears grid styles from container', () => {
    const container = document.createElement('div');
    applyCssMasonry(container, 16, 250);
    removeCssMasonry(container);
    expect(container.style.display).toBe('');
    expect(container.style.gap).toBe('');
  });
});

// ── MasonrySnapGridLayout class ───────────────────────────────────────────────

describe('MasonrySnapGridLayout', () => {
  let container: HTMLDivElement;

  const makeItem = (title: string) => {
    const el = document.createElement('div');
    el.textContent = title;
    return el;
  };

  const items = ['Alpha', 'Beta', 'Gamma'];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders items into the container', () => {
    new MasonrySnapGridLayout(container, {
      items,
      renderItem: makeItem,
      layoutMode: 'js',
    });
    expect(container.children.length).toBe(items.length);
  });

  it('updates items on updateItems()', () => {
    const masonry = new MasonrySnapGridLayout(container, {
      items,
      renderItem: makeItem,
      layoutMode: 'js',
    });
    masonry.updateItems(['One', 'Two']);
    expect(container.children.length).toBe(2);
  });

  it('clears the container on destroy()', () => {
    const masonry = new MasonrySnapGridLayout(container, {
      items,
      renderItem: makeItem,
      layoutMode: 'js',
    });
    masonry.destroy();
    expect(container.children.length).toBe(0);
  });

  it('disconnects ResizeObserver on destroy()', () => {
    const disconnectSpy = vi.fn();
    const OriginalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect = disconnectSpy;
    } as unknown as typeof ResizeObserver;

    const masonry = new MasonrySnapGridLayout(container, {
      items,
      renderItem: makeItem,
      layoutMode: 'js',
    });
    masonry.destroy();
    expect(disconnectSpy).toHaveBeenCalledOnce();

    globalThis.ResizeObserver = OriginalResizeObserver;
  });

  it('handles zero-width container gracefully', () => {
    Object.defineProperty(container, 'clientWidth', { value: 0, configurable: true });
    expect(() =>
      new MasonrySnapGridLayout(container, {
        items,
        renderItem: makeItem,
        layoutMode: 'js',
      })
    ).not.toThrow();
  });

  it('applies CSS masonry when layoutMode is "auto" and browser supports it', () => {
    const originalSupports = CSS.supports;
    CSS.supports = vi.fn().mockReturnValue(true);

    new MasonrySnapGridLayout(container, {
      items,
      renderItem: makeItem,
      layoutMode: 'auto',
    });
    expect(container.style.display).toBe('grid');

    CSS.supports = originalSupports;
  });

  it('uses default options when none provided', () => {
    const masonry = new MasonrySnapGridLayout(container, {
      items: [],
      renderItem: makeItem,
    });
    // Should not throw; uses layoutMode 'auto', gutter 16, minColWidth 250
    expect(container).toBeTruthy();
    masonry.destroy();
  });
});
