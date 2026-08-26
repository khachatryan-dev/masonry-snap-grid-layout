import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { renderToString } from 'vue/server-renderer';
import { createSSRApp, h } from 'vue';
import MasonrySnapGrid from '../src/vue/MasonrySnapGrid.vue';
import {
  flushFrames,
  installMockResizeObserver,
  mockRectGeometry,
  MockResizeObserver,
  setScrollY,
} from './setup';

type Item = { id: number; title: string };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, title: `Item ${i}` }));

/**
 * Item template. The wrapper element the component creates carries no explicit
 * height, so `tests/setup.ts` reports the default 200px — giving a uniform
 * 3-column grid at the default 800px container width:
 *   cols = floor((800 + 16) / (250 + 16)) = 3, colWidth = (800 - 32) / 3 = 256
 *   row step = 200 + 16 = 216 -> row tops 0, 216, 432, 648, 864, 1080
 */
const itemSlot = {
  default: (params: { item: Item; index: number }) =>
    h('div', { 'data-testid': `item-${params.item.id}` }, params.item.title),
};

function mountGrid(
  props: Record<string, unknown>
): VueWrapper<InstanceType<typeof MasonrySnapGrid>> {
  return mount(MasonrySnapGrid, {
    props: { layoutMode: 'js', ...props },
    slots: itemSlot,
    attachTo: document.body,
  }) as VueWrapper<InstanceType<typeof MasonrySnapGrid>>;
}

/** Let onMounted's awaits, nextTick, and any pending frames settle. */
async function settle(wrapper: VueWrapper<unknown>): Promise<void> {
  await flushFrames();
  await wrapper.vm.$nextTick();
}

const items = (wrapper: VueWrapper<unknown>) =>
  wrapper.element.querySelectorAll<HTMLElement>('.msgl-item');

const testIds = (wrapper: VueWrapper<unknown>) =>
  Array.from(wrapper.element.querySelectorAll<HTMLElement>('[data-testid]')).map(
    (el) => el.dataset.testid
  );

describe('Vue MasonrySnapGrid rendering', () => {
  it('renders every item through the scoped slot', async () => {
    const wrapper = mountGrid({ items: makeItems(4) });
    await settle(wrapper);

    expect(items(wrapper)).toHaveLength(4);
    expect(wrapper.text()).toContain('Item 0');
    expect(wrapper.text()).toContain('Item 3');
    wrapper.unmount();
  });

  it('exposes the item index to the slot', async () => {
    const wrapper = mount(MasonrySnapGrid, {
      props: { items: makeItems(3), layoutMode: 'js' },
      slots: {
        default: (p: { item: Item; index: number }) =>
          h('div', { 'data-testid': `idx-${p.index}` }, p.item.title),
      },
      attachTo: document.body,
    });
    await settle(wrapper);

    expect(testIds(wrapper)).toEqual(['idx-0', 'idx-1', 'idx-2']);
    wrapper.unmount();
  });

  it('renders an empty grid without error', async () => {
    const wrapper = mountGrid({ items: [] });
    await settle(wrapper);

    expect(items(wrapper)).toHaveLength(0);
    wrapper.unmount();
  });

  it('switches to the JS mode class after mount', async () => {
    const wrapper = mountGrid({ items: makeItems(2) });
    await settle(wrapper);

    expect(wrapper.classes()).toContain('msgl-container--js');
    expect(wrapper.classes()).not.toContain('msgl-container--ssr');
    wrapper.unmount();
  });
});

describe('Vue MasonrySnapGrid server rendering', () => {
  it('includes every item in the server-rendered HTML', async () => {
    // SEO is the whole point of the SSR pass: items must be in page source.
    const app = createSSRApp({
      render: () =>
        h(
          MasonrySnapGrid as never,
          { items: makeItems(5), layoutMode: 'js' },
          itemSlot
        ),
    });
    const html = await renderToString(app);

    for (let i = 0; i < 5; i++) expect(html).toContain(`item-${i}`);
  });

  it('uses the SSR grid class on the server', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          MasonrySnapGrid as never,
          { items: makeItems(2), layoutMode: 'js' },
          itemSlot
        ),
    });
    const html = await renderToString(app);

    expect(html).toContain('msgl-container--ssr');
  });
});

describe('Vue MasonrySnapGrid layout', () => {
  it('absolutely positions items with a transform', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    const first = items(wrapper)[0];
    expect(first.style.position).toBe('absolute');
    expect(first.style.width).toBe('256px');
    expect(first.style.transform).toBe('translate(0px, 0px)');
    wrapper.unmount();
  });

  it('fills the first row across three columns', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    const xs = Array.from(items(wrapper)).map((el) => el.style.transform);
    expect(xs).toEqual([
      'translate(0px, 0px)',
      'translate(272px, 0px)',
      'translate(544px, 0px)',
    ]);
    wrapper.unmount();
  });

  it('wraps to the next row using the shortest column', async () => {
    const wrapper = mountGrid({ items: makeItems(4) });
    await settle(wrapper);

    expect(items(wrapper)[3].style.transform).toBe('translate(0px, 216px)');
    wrapper.unmount();
  });

  it('sets the container height excluding the trailing gutter', async () => {
    const wrapper = mountGrid({ items: makeItems(6) });
    await settle(wrapper);

    // 2 rows of 200px plus one 16px gutter.
    expect(wrapper.element.style.height).toBe('416px');
    wrapper.unmount();
  });

  it('respects a custom gutter', async () => {
    const wrapper = mountGrid({ items: makeItems(3), gutter: 0 });
    await settle(wrapper);

    // 3 columns of exactly 800/3 with no gaps.
    const xs = Array.from(items(wrapper)).map((el) => el.style.transform);
    expect(xs[1]).toContain('translate(266.6');
    wrapper.unmount();
  });

  it('applies the animation class when animate is enabled', async () => {
    const wrapper = mountGrid({ items: makeItems(2), animate: true });
    await settle(wrapper);

    expect(items(wrapper)[0].classList.contains('msgl-item--animated')).toBe(true);
    wrapper.unmount();
  });

  it('omits the animation class when animate is disabled', async () => {
    const wrapper = mountGrid({ items: makeItems(2), animate: false });
    await settle(wrapper);

    expect(items(wrapper)[0].classList.contains('msgl-item--animated')).toBe(false);
    wrapper.unmount();
  });

  it('relayouts when items change', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    await wrapper.setProps({ items: makeItems(6) });
    await settle(wrapper);

    expect(items(wrapper)).toHaveLength(6);
    expect(wrapper.element.style.height).toBe('416px');
    wrapper.unmount();
  });

  it('relayouts when minColWidth changes', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);
    expect(items(wrapper)[0].style.width).toBe('256px');

    // A 390px minimum leaves room for exactly 2 columns:
    // floor((800 + 16) / (390 + 16)) = 2, each (800 - 16) / 2 = 392px.
    await wrapper.setProps({ minColWidth: 390 });
    await settle(wrapper);

    expect(items(wrapper)[0].style.width).toBe('392px');

    // A 400px minimum no longer fits two: floor(816 / 416) = 1.
    await wrapper.setProps({ minColWidth: 400 });
    await settle(wrapper);

    expect(items(wrapper)[0].style.width).toBe('800px');
    wrapper.unmount();
  });

  it('emits layout with the resolved geometry', async () => {
    const wrapper = mountGrid({ items: makeItems(6) });
    await settle(wrapper);

    const events = wrapper.emitted('layout');
    expect(events).toBeTruthy();
    expect(events![events!.length - 1][0]).toMatchObject({
      columnCount: 3,
      columnWidth: 256,
      containerHeight: 416,
      itemCount: 6,
      engine: 'js',
    });
    wrapper.unmount();
  });

  it('exposes a refresh method', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    expect(typeof (wrapper.vm as unknown as { refresh: unknown }).refresh).toBe(
      'function'
    );
    expect(() =>
      (wrapper.vm as unknown as { refresh: () => void }).refresh()
    ).not.toThrow();
    wrapper.unmount();
  });
});

describe('Vue MasonrySnapGrid columns', () => {
  const distinctX = (wrapper: VueWrapper<unknown>) => {
    const xs = Array.from(items(wrapper)).map((el) => {
      const m = /translate\((\d+(?:\.\d+)?)px/.exec(el.style.transform);
      return m ? m[1] : '';
    });
    return [...new Set(xs)];
  };

  it('honours a fixed column count', async () => {
    const wrapper = mountGrid({ items: makeItems(6), columns: 2 });
    await settle(wrapper);

    expect(distinctX(wrapper)).toHaveLength(2);
    expect(items(wrapper)[0].style.width).toBe('392px');
    wrapper.unmount();
  });

  it('resolves a breakpoint map against the container width', async () => {
    const wrapper = mountGrid({
      items: makeItems(6),
      columns: { 0: 1, 640: 2, 1200: 4 },
    });
    await settle(wrapper);

    // The container measures 800px, so the 640 breakpoint wins.
    expect(distinctX(wrapper)).toHaveLength(2);
    wrapper.unmount();
  });

  it('relayouts when columns change', async () => {
    const wrapper = mountGrid({ items: makeItems(6), columns: 2 });
    await settle(wrapper);
    expect(distinctX(wrapper)).toHaveLength(2);

    await wrapper.setProps({ columns: 3 });
    await settle(wrapper);

    expect(distinctX(wrapper)).toHaveLength(3);
    wrapper.unmount();
  });
});

describe('Vue MasonrySnapGrid item identity', () => {
  it('keeps a DOM node attached to its item when the list is prepended to', async () => {
    // Without a stable key, index is the only identity, so prepending shifts
    // every item into its neighbour's node and inherits its cached height.
    const base = makeItems(3);
    const wrapper = mountGrid({
      items: base,
      getItemKey: (item: Item) => item.id,
    });
    await settle(wrapper);

    const before = wrapper.element.querySelector('[data-testid="item-2"]');

    await wrapper.setProps({
      items: [{ id: 99, title: 'Item 99' }, ...base],
    });
    await settle(wrapper);

    expect(wrapper.element.querySelector('[data-testid="item-2"]')).toBe(before);
    wrapper.unmount();
  });
});

describe('Vue MasonrySnapGrid virtualization', () => {
  afterEach(() => setScrollY(0));

  it('renders every item when virtualize is off', async () => {
    const wrapper = mountGrid({ items: makeItems(18) });
    await settle(wrapper);

    expect(items(wrapper)).toHaveLength(18);
    wrapper.unmount();
  });

  it('clips items below the viewport once measured', async () => {
    const wrapper = mountGrid({
      items: makeItems(18),
      virtualize: true,
      overscan: 0,
    });
    await settle(wrapper);
    mockRectGeometry(wrapper.element as HTMLElement, 0);

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    await settle(wrapper);

    // A 768px viewport reaches row 3 (y=648); row 4 starts at 864.
    expect(testIds(wrapper)).toContain('item-0');
    expect(testIds(wrapper)).not.toContain('item-17');
    wrapper.unmount();
  });

  it('keeps the container height correct while items are clipped', async () => {
    const wrapper = mountGrid({
      items: makeItems(18),
      virtualize: true,
      overscan: 0,
    });
    await settle(wrapper);

    // 6 rows of 200px plus 5 gutters — the scrollbar must not shrink.
    expect(wrapper.element.style.height).toBe('1280px');
    wrapper.unmount();
  });

  it('brings later rows in as the page scrolls', async () => {
    // Vue previously never refreshed the container offset on scroll — only
    // React had that fix — so the visible window drifted out of alignment.
    const wrapper = mountGrid({
      items: makeItems(18),
      virtualize: true,
      overscan: 0,
    });
    await settle(wrapper);
    mockRectGeometry(wrapper.element as HTMLElement, 0);

    expect(testIds(wrapper)).not.toContain('item-15');

    setScrollY(1080);
    window.dispatchEvent(new Event('scroll'));
    await settle(wrapper);

    expect(testIds(wrapper)).toContain('item-15');
    wrapper.unmount();
  });

  it('drops rows that scroll above the window', async () => {
    const wrapper = mountGrid({
      items: makeItems(18),
      virtualize: true,
      overscan: 0,
    });
    await settle(wrapper);
    mockRectGeometry(wrapper.element as HTMLElement, 0);

    expect(testIds(wrapper)).toContain('item-0');

    setScrollY(300);
    window.dispatchEvent(new Event('scroll'));
    await settle(wrapper);

    expect(testIds(wrapper)).not.toContain('item-0');
    expect(testIds(wrapper)).toContain('item-3');
    wrapper.unmount();
  });

  it('virtualizes against an element scroll container', async () => {
    const box = document.createElement('div');
    Object.defineProperty(box, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    box.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    document.body.appendChild(box);

    const wrapper = mountGrid({
      items: makeItems(18),
      virtualize: true,
      overscan: 0,
      scrollContainer: box,
    });
    await settle(wrapper);

    const grid = wrapper.element as HTMLElement;
    grid.getBoundingClientRect = () => ({ top: -box.scrollTop }) as DOMRect;

    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    await settle(wrapper);

    // A 400px panel reaches row 1 (y=216); row 2 starts at 432.
    expect(testIds(wrapper)).toContain('item-0');
    expect(testIds(wrapper)).not.toContain('item-17');

    box.scrollTop = 1080;
    box.dispatchEvent(new Event('scroll'));
    await settle(wrapper);

    expect(testIds(wrapper)).toContain('item-15');

    wrapper.unmount();
    box.remove();
  });

  it('clips a large list immediately when given an estimated height', async () => {
    const wrapper = mountGrid({
      items: makeItems(300),
      virtualize: true,
      overscan: 0,
      estimatedItemHeight: 200,
    });
    await settle(wrapper);

    expect(items(wrapper).length).toBeLessThan(300);
    // 100 rows x 200px + 99 gutters x 16px
    expect(wrapper.element.style.height).toBe('21584px');
    wrapper.unmount();
  });
});

describe('Vue MasonrySnapGrid self-healing measurement', () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installMockResizeObserver();
  });

  afterEach(() => restore());

  it('observes each item so content settling can trigger a relayout', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    const watchingItems = MockResizeObserver.instances.some((o) =>
      [...o.observed].some((el) =>
        (el as HTMLElement).classList.contains('msgl-item')
      )
    );
    expect(watchingItems).toBe(true);
    wrapper.unmount();
  });

  it('relayouts when an item resizes after first measurement', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    const before = wrapper.emitted('layout')?.length ?? 0;
    const item = items(wrapper)[0];
    const observer = MockResizeObserver.instances.find((o) =>
      o.observed.has(item)
    )!;

    observer.emit([item]);
    await settle(wrapper);

    expect(wrapper.emitted('layout')!.length).toBeGreaterThan(before);
    wrapper.unmount();
  });

  it('does not observe items when observeItemResize is false', async () => {
    const wrapper = mountGrid({
      items: makeItems(3),
      observeItemResize: false,
    });
    await settle(wrapper);

    const watchingItems = MockResizeObserver.instances.some((o) =>
      [...o.observed].some((el) =>
        (el as HTMLElement).classList.contains('msgl-item')
      )
    );
    expect(watchingItems).toBe(false);
    wrapper.unmount();
  });

  it('tears down every observer on unmount', async () => {
    const wrapper = mountGrid({ items: makeItems(3) });
    await settle(wrapper);

    wrapper.unmount();

    expect(MockResizeObserver.instances.some((o) => o.observed.size > 0)).toBe(
      false
    );
  });

  it('removes its scroll listeners on unmount', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountGrid({ items: makeItems(3), virtualize: true });
    await settle(wrapper);

    wrapper.unmount();

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    remove.mockRestore();
  });
});

describe('Vue MasonrySnapGrid CSS masonry mode', () => {
  let originalCSS: typeof globalThis.CSS;

  beforeEach(() => {
    originalCSS = globalThis.CSS;
  });

  afterEach(() => {
    globalThis.CSS = originalCSS;
  });

  /** Report native masonry support, which no browser does unflagged today. */
  const supportMasonry = () => {
    globalThis.CSS = {
      supports: (property: string, value?: string) =>
        property === 'grid-template-rows' && value === 'masonry',
    } as unknown as typeof globalThis.CSS;
  };

  it('uses the CSS masonry class when the browser supports it', async () => {
    supportMasonry();
    const wrapper = mount(MasonrySnapGrid, {
      props: { items: makeItems(4), layoutMode: 'auto' },
      slots: itemSlot,
      attachTo: document.body,
    });
    await settle(wrapper);

    expect(wrapper.classes()).toContain('msgl-container--css');
    expect(wrapper.classes()).not.toContain('msgl-container--js');
    wrapper.unmount();
  });

  it('writes no transforms, since the browser positions items', async () => {
    supportMasonry();
    const wrapper = mount(MasonrySnapGrid, {
      props: { items: makeItems(4), layoutMode: 'auto' },
      slots: itemSlot,
      attachTo: document.body,
    });
    await settle(wrapper);

    expect(items(wrapper)[0].style.transform).toBe('');
    expect(items(wrapper)[0].style.position).toBe('');
    wrapper.unmount();
  });

  it('renders every item, because CSS masonry cannot virtualize', async () => {
    supportMasonry();
    const wrapper = mount(MasonrySnapGrid, {
      props: { items: makeItems(30), layoutMode: 'auto', virtualize: true },
      slots: itemSlot,
      attachTo: document.body,
    });
    await settle(wrapper);

    expect(items(wrapper)).toHaveLength(30);
    wrapper.unmount();
  });

  it('exposes gutter and column width as custom properties', async () => {
    supportMasonry();
    const wrapper = mount(MasonrySnapGrid, {
      props: {
        items: makeItems(2),
        layoutMode: 'auto',
        gutter: 24,
        minColWidth: 300,
      },
      slots: itemSlot,
      attachTo: document.body,
    });
    await settle(wrapper);

    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--msgl-gutter: 24px');
    expect(style).toContain('--msgl-min-col-width: 300px');
    wrapper.unmount();
  });

  it('writes an explicit track list when columns is set', async () => {
    supportMasonry();
    const wrapper = mount(MasonrySnapGrid, {
      props: { items: makeItems(6), layoutMode: 'auto', columns: 2 },
      slots: itemSlot,
      attachTo: document.body,
    });
    await settle(wrapper);

    expect((wrapper.element as HTMLElement).style.gridTemplateColumns).toBe(
      'repeat(2, minmax(0, 1fr))'
    );
    wrapper.unmount();
  });

  it('falls back to the JS engine when support is absent', async () => {
    globalThis.CSS = {
      supports: () => false,
    } as unknown as typeof globalThis.CSS;

    const wrapper = mount(MasonrySnapGrid, {
      props: { items: makeItems(4), layoutMode: 'auto' },
      slots: itemSlot,
      attachTo: document.body,
    });
    await settle(wrapper);

    expect(wrapper.classes()).toContain('msgl-container--js');
    expect(items(wrapper)[0].style.transform).toContain('translate(');
    wrapper.unmount();
  });
});
