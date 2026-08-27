// @vitest-environment node
/**
 * Real server-rendering tests.
 *
 * Every other suite runs in jsdom, where `window`, `document`, `CSS`, and
 * friends all exist — so a `renderToString` test there is not actually testing
 * server rendering. Production SSR (a Next.js or Nuxt server) runs in plain
 * Node with none of those globals. A module that touched `window` at import
 * time, or during render, would crash in production while every jsdom test
 * still passed.
 *
 * This file runs in a pure Node environment to close that gap.
 */
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { renderToString as renderReact } from 'react-dom/server';
import { renderToString as renderVue } from 'vue/server-renderer';
import { createSSRApp, h } from 'vue';

type Item = { id: number; title: string; height: number };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
    height: 100 + i * 20,
  }));

describe('server environment', () => {
  it('has none of the browser globals the components guard against', () => {
    // If this fails, the suite is not testing what it claims to.
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof CSS).toBe('undefined');
    expect(typeof ResizeObserver).toBe('undefined');
    expect(typeof requestAnimationFrame).toBe('undefined');
  });
});

describe('SSR: module import safety', () => {
  it('imports the package entry without touching the DOM', async () => {
    const mod = await import('../src/index');
    expect(typeof mod.default).toBe('function');
  });

  it('imports the core public API without touching the DOM', async () => {
    const core = await import('../src/core');
    expect(typeof core.computeLayout).toBe('function');
    expect(typeof core.createItemObserver).toBe('function');
  });

  it('imports the React adapter without touching the DOM', async () => {
    const mod = await import('../src/react');
    expect(typeof mod.default).toBe('function');
  });

  it('imports the Vue adapter without touching the DOM', async () => {
    const mod = await import('../src/vue');
    expect(mod.default).toBeTruthy();
  });

  it('imports the Angular adapter without touching the DOM', async () => {
    // Angular ships as TypeScript source compiled in the consumer's build, and
    // Angular apps are commonly server-rendered, so importing it must be safe.
    const mod = await import('../src/angular');
    expect(typeof mod.MasonrySnapGridComponent).toBe('function');
  });
});

describe('SSR: CSS feature detection falls back safely', () => {
  it('reports no CSS masonry support when CSS is undefined', async () => {
    // `CSS.supports` cannot be consulted on a server. Returning false is what
    // makes the server emit the JS/SSR markup rather than CSS masonry markup.
    const { supportsCss } = await import('../src/core');
    expect(supportsCss('grid-template-rows', 'masonry')).toBe(false);
  });
});

describe('SSR: pure logic runs without a DOM', () => {
  it('computes layout on the server', async () => {
    const { computeLayout } = await import('../src/core');
    const r = computeLayout({
      count: 6,
      heights: new Array(6).fill(200),
      containerWidth: 800,
      gutter: 16,
      minColWidth: 250,
    });
    expect(r.columnCount).toBe(3);
    expect(r.containerHeight).toBe(416);
  });

  it('degrades the item observer to a no-op without ResizeObserver', async () => {
    const { createItemObserver } = await import('../src/core');
    const obs = createItemObserver({ onChange: () => {} });
    expect(() => {
      obs.observe(null);
      obs.reset();
      obs.disconnect();
    }).not.toThrow();
  });

  it('resolves no scroll target without a window', async () => {
    const { resolveScrollTarget, readScrollState, EMPTY_SCROLL_STATE } =
      await import('../src/core');
    expect(resolveScrollTarget('window')).toBeNull();
    expect(readScrollState(null, null)).toEqual(EMPTY_SCROLL_STATE);
  });

  it('makes the scroll tracker a no-op without a target', async () => {
    const { createScrollTracker } = await import('../src/core');
    const dispose = createScrollTracker(
      null,
      () => null,
      () => {}
    );
    expect(() => dispose()).not.toThrow();
  });
});

describe('SSR: React output', () => {
  let MasonrySnapGrid: typeof import('../src/react/MasonrySnapGrid').default;

  beforeAll(async () => {
    MasonrySnapGrid = (await import('../src/react/MasonrySnapGrid')).default;
  });

  const renderItem = (item: Item) => (
    <div data-testid={`item-${item.id}`}>{item.title}</div>
  );

  it('renders without throwing on a server', () => {
    expect(() =>
      renderReact(<MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />)
    ).not.toThrow();
  });

  it('includes every item in the HTML, so crawlers can index them', () => {
    const html = renderReact(
      <MasonrySnapGrid items={makeItems(12)} renderItem={renderItem} />
    );
    for (let i = 0; i < 12; i++) expect(html).toContain(`Item ${i}`);
  });

  it('uses the SSR grid class, not the JS or CSS class', () => {
    const html = renderReact(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />
    );
    expect(html).toContain('msgl-container--ssr');
    expect(html).not.toContain('msgl-container--js');
    expect(html).not.toContain('msgl-container--css');
  });

  it('emits all items even with virtualize enabled', () => {
    // Clipping on the server would hide content from crawlers, and would
    // guarantee a hydration mismatch.
    const html = renderReact(
      <MasonrySnapGrid items={makeItems(50)} renderItem={renderItem} virtualize />
    );
    for (let i = 0; i < 50; i++) expect(html).toContain(`Item ${i}`);
  });

  it('emits all items even with virtualize and an estimated height', () => {
    const html = renderReact(
      <MasonrySnapGrid
        items={makeItems(30)}
        renderItem={renderItem}
        virtualize
        estimatedItemHeight={200}
      />
    );
    for (let i = 0; i < 30; i++) expect(html).toContain(`Item ${i}`);
  });

  it('does not emit absolute positioning before hydration', () => {
    // Positions are unknown until heights are measured in the browser, so the
    // server must emit ordinary flow markup.
    const html = renderReact(
      <MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />
    );
    expect(html).not.toContain('position:absolute');
    expect(html).not.toContain('translate(');
  });

  it('passes gutter and column width through as custom properties', () => {
    const html = renderReact(
      <MasonrySnapGrid
        items={makeItems(2)}
        renderItem={renderItem}
        gutter={24}
        minColWidth={300}
      />
    );
    expect(html).toContain('--msgl-gutter:24px');
    expect(html).toContain('--msgl-min-col-width:300px');
  });

  it('logs no warnings during server rendering', () => {
    // React warns for any component scheduling useLayoutEffect on the server.
    const seen: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void seen.push(String(args[0]));
    try {
      renderReact(<MasonrySnapGrid items={makeItems(3)} renderItem={renderItem} />);
    } finally {
      console.error = original;
    }
    expect(seen).toEqual([]);
  });

  it('applies a custom className on the server', () => {
    const html = renderReact(
      <MasonrySnapGrid
        items={makeItems(1)}
        renderItem={renderItem}
        className="my-grid"
      />
    );
    expect(html).toContain('my-grid');
  });

  it('honours getItemKey without affecting the markup', () => {
    const html = renderReact(
      <MasonrySnapGrid
        items={makeItems(3)}
        renderItem={renderItem}
        getItemKey={(item) => item.id}
      />
    );
    expect(html).toContain('Item 2');
  });
});

describe('SSR: Vue output', () => {
  const slot = {
    default: (p: { item: Item; index: number }) =>
      h('div', { 'data-testid': `item-${p.item.id}` }, p.item.title),
  };

  const render = async (props: Record<string, unknown>) => {
    const Grid = (await import('../src/vue/MasonrySnapGrid.vue')).default;
    const app = createSSRApp({
      render: () => h(Grid as never, props, slot),
    });
    return renderVue(app);
  };

  it('renders without throwing on a server', async () => {
    await expect(render({ items: makeItems(3) })).resolves.toBeTypeOf('string');
  });

  it('includes every item in the HTML, so crawlers can index them', async () => {
    const html = await render({ items: makeItems(12) });
    for (let i = 0; i < 12; i++) expect(html).toContain(`Item ${i}`);
  });

  it('uses the SSR grid class, not the JS or CSS class', async () => {
    const html = await render({ items: makeItems(3) });
    expect(html).toContain('msgl-container--ssr');
    expect(html).not.toContain('msgl-container--js');
    expect(html).not.toContain('msgl-container--css');
  });

  it('emits all items even with virtualize enabled', async () => {
    const html = await render({ items: makeItems(40), virtualize: true });
    for (let i = 0; i < 40; i++) expect(html).toContain(`Item ${i}`);
  });

  it('does not emit absolute positioning before hydration', async () => {
    const html = await render({ items: makeItems(3) });
    expect(html).not.toContain('position:absolute');
    expect(html).not.toContain('translate(');
  });

  it('renders a single root element so parent class and style apply', async () => {
    // A comment sibling of the root would make this a fragment component and
    // silently break attribute fallthrough.
    const html = await render({ items: makeItems(1) });
    expect(html.trimStart().startsWith('<div')).toBe(true);
  });
});

describe('SSR: Vanilla engine', () => {
  it('can be imported on a server and only needs a DOM when constructed', async () => {
    const { default: MasonrySnapGridLayout } = await import('../src/vanilla');
    expect(typeof MasonrySnapGridLayout).toBe('function');
    // Constructing it requires a real element, which a server does not have —
    // that is why the framework adapters defer construction to the client.
    expect(typeof document).toBe('undefined');
  });
});
