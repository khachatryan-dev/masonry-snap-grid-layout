import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MasonrySnapGridLayout from '../src/vanilla/MasonrySnapGridLayout';
import type { LayoutInfo } from '../src/core';
import { installMockResizeObserver, MockResizeObserver } from './setup';

/**
 * Engine selection and the CSS -> JS fallback.
 *
 * `layoutMode: 'auto'` picks the native CSS masonry engine only when the
 * browser reports support, and the JS engine otherwise. Both directions matter:
 * applying `grid-template-rows: masonry` where it is unsupported would silently
 * produce a plain grid, and refusing to use it where it *is* supported would
 * forfeit native performance.
 *
 * jsdom reports no masonry support, so the supported branch is exercised by
 * stubbing `CSS.supports` — which is also the only way to test the branch at
 * all today, given no browser ships the feature unflagged.
 */

type Item = string;

const ITEMS: Item[] = ['Alpha', 'Beta', 'Gamma', 'Delta'];

const makeItem = (title: Item): HTMLElement => {
  const el = document.createElement('div');
  el.textContent = title;
  return el;
};

let container: HTMLDivElement;
let originalCSS: typeof globalThis.CSS;

/** Force `CSS.supports` to a fixed answer for masonry. */
function stubCssSupport(supported: boolean): void {
  globalThis.CSS = {
    supports: (property: string, value?: string) =>
      property === 'grid-template-rows' && value === 'masonry' ? supported : false,
  } as unknown as typeof globalThis.CSS;
}

beforeEach(() => {
  originalCSS = globalThis.CSS;
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  globalThis.CSS = originalCSS;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const items = () => Array.from(container.children) as HTMLElement[];

const build = (options: Record<string, unknown> = {}) =>
  new MasonrySnapGridLayout<Item>(container, {
    items: ITEMS,
    renderItem: makeItem,
    ...options,
  });

describe('engine selection', () => {
  it('falls back to the JS engine when the browser lacks CSS masonry', () => {
    stubCssSupport(false);
    const masonry = build({ layoutMode: 'auto' });

    // JS engine signature: absolutely positioned items with transforms.
    expect(items()[0].style.position).toBe('absolute');
    expect(items()[0].style.transform).toContain('translate(');
    expect(container.style.position).toBe('relative');
    // And no native masonry properties.
    expect(container.style.gridTemplateRows).toBe('');
    masonry.destroy();
  });

  it('uses the native CSS engine when the browser supports it', () => {
    stubCssSupport(true);
    const masonry = build({ layoutMode: 'auto' });

    expect(container.style.display).toBe('grid');
    expect(container.style.gridTemplateRows).toBe('masonry');
    expect(container.style.alignContent).toBe('start');
    // The browser positions items natively, so the engine writes no transforms.
    expect(items()[0].style.transform).toBe('');
    expect(items()[0].style.position).toBe('');
    masonry.destroy();
  });

  it("ignores native support when layoutMode is 'js'", () => {
    stubCssSupport(true);
    const masonry = build({ layoutMode: 'js' });

    expect(items()[0].style.transform).toContain('translate(');
    expect(container.style.gridTemplateRows).toBe('');
    masonry.destroy();
  });

  it('defaults to auto when no layoutMode is given', () => {
    stubCssSupport(true);
    const masonry = build();
    expect(container.style.gridTemplateRows).toBe('masonry');
    masonry.destroy();
  });

  it('treats a throwing CSS.supports as unsupported', () => {
    // Some engines throw on a malformed declaration; a crash here would take
    // the whole grid down.
    globalThis.CSS = {
      supports: () => {
        throw new Error('boom');
      },
    } as unknown as typeof globalThis.CSS;

    const masonry = build({ layoutMode: 'auto' });
    expect(items()[0].style.transform).toContain('translate(');
    masonry.destroy();
  });

  it('treats a missing CSS global as unsupported', () => {
    globalThis.CSS = undefined as unknown as typeof globalThis.CSS;
    const masonry = build({ layoutMode: 'auto' });
    expect(items()[0].style.transform).toContain('translate(');
    masonry.destroy();
  });
});

describe('CSS engine: column control', () => {
  beforeEach(() => stubCssSupport(true));

  it('uses auto-fill from minColWidth by default', () => {
    const masonry = build({ minColWidth: 300 });
    expect(container.style.gridTemplateColumns).toBe(
      'repeat(auto-fill, minmax(300px, 1fr))'
    );
    masonry.destroy();
  });

  it('writes an explicit track list for a fixed column count', () => {
    const masonry = build({ columns: 2 });
    expect(container.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    masonry.destroy();
  });

  it('resolves a breakpoint map against the container width', () => {
    // The container measures 800px via the test harness, so 640 wins.
    const masonry = build({ columns: { 0: 1, 640: 2, 1200: 4 } });
    expect(container.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    masonry.destroy();
  });

  it('applies the gutter as a grid gap', () => {
    const masonry = build({ gutter: 24 });
    expect(container.style.gap).toBe('24px');
    masonry.destroy();
  });
});

describe('CSS engine: lifecycle', () => {
  beforeEach(() => stubCssSupport(true));

  it('removes every native masonry property on destroy', () => {
    const masonry = build();
    expect(container.style.display).toBe('grid');

    masonry.destroy();

    expect(container.style.display).toBe('');
    expect(container.style.gridTemplateRows).toBe('');
    expect(container.style.gridTemplateColumns).toBe('');
    expect(container.style.gap).toBe('');
    expect(container.style.alignContent).toBe('');
  });

  it('does not observe individual items, since the browser handles placement', () => {
    const restore = installMockResizeObserver();
    try {
      const masonry = build();
      const watchingItems = MockResizeObserver.instances.some((o) =>
        [...o.observed].some((el) => el !== container)
      );
      expect(watchingItems).toBe(false);
      masonry.destroy();
    } finally {
      restore();
    }
  });

  it("reports engine 'css' to onLayout", () => {
    const seen: LayoutInfo[] = [];
    const masonry = build({ onLayout: (i: LayoutInfo) => seen.push(i) });
    expect(seen.at(-1)?.engine).toBe('css');
    masonry.destroy();
  });

  it("reports engine 'js' to onLayout when falling back", () => {
    stubCssSupport(false);
    const seen: LayoutInfo[] = [];
    const masonry = build({ onLayout: (i: LayoutInfo) => seen.push(i) });
    expect(seen.at(-1)?.engine).toBe('js');
    expect(seen.at(-1)?.columnCount).toBe(3);
    masonry.destroy();
  });
});

describe('switching engines via setOptions', () => {
  it('cleans up native properties when moving from CSS to JS', () => {
    // Leftovers from the outgoing engine would fight the incoming one.
    stubCssSupport(true);
    const masonry = build({ layoutMode: 'auto' });
    expect(container.style.gridTemplateRows).toBe('masonry');

    masonry.setOptions({ layoutMode: 'js' });

    expect(container.style.display).toBe('');
    expect(container.style.gridTemplateRows).toBe('');
    expect(container.style.gridTemplateColumns).toBe('');
    expect(items()[0].style.transform).toContain('translate(');
    masonry.destroy();
  });

  it('cleans up inline positioning when moving from JS to CSS', () => {
    stubCssSupport(true);
    const masonry = build({ layoutMode: 'js' });
    expect(items()[0].style.transform).toContain('translate(');

    masonry.setOptions({ layoutMode: 'auto' });

    expect(items()[0].style.transform).toBe('');
    expect(items()[0].style.position).toBe('');
    expect(container.style.height).toBe('');
    expect(container.style.gridTemplateRows).toBe('masonry');
    masonry.destroy();
  });

  it('stays on the JS engine when auto still resolves to JS', () => {
    stubCssSupport(false);
    const masonry = build({ layoutMode: 'js' });

    masonry.setOptions({ layoutMode: 'auto' });

    expect(items()[0].style.transform).toContain('translate(');
    expect(container.style.gridTemplateRows).toBe('');
    masonry.destroy();
  });

  it('re-resolves the column track list on a later setOptions', () => {
    stubCssSupport(true);
    const masonry = build({ columns: 2 });
    expect(container.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');

    masonry.setOptions({ columns: 4 });
    expect(container.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    masonry.destroy();
  });
});
