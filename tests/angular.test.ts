import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ElementRef, SimpleChange, SimpleChanges } from '@angular/core';
import { MasonrySnapGridComponent } from '../src/angular/masonry-snap-grid.component';
import type { LayoutInfo } from '../src/core';

/**
 * These tests drive the component class directly rather than through TestBed.
 * Every behaviour that matters here — engine construction, input forwarding,
 * teardown — lives in the lifecycle hooks, so a full Angular platform (zone.js,
 * a compiler, a browser platform) would add setup cost without adding coverage.
 */

type Item = { id: number; title: string };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, title: `Item ${i}` }));

const renderItem = (item: Item): HTMLElement => {
  const el = document.createElement('div');
  el.dataset.testid = `item-${item.id}`;
  el.textContent = item.title;
  return el;
};

/** Build a component wired to a real container element. */
function makeComponent(overrides: Partial<MasonrySnapGridComponent<Item>> = {}): {
  component: MasonrySnapGridComponent<Item>;
  container: HTMLDivElement;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const component = new MasonrySnapGridComponent<Item>();
  component.items = makeItems(3);
  component.renderItem = renderItem;
  component.layoutMode = 'js';
  Object.assign(component, overrides);

  // `containerRef` is a private @ViewChild, populated by Angular before
  // ngAfterViewInit; stand in for that here.
  (
    component as unknown as { containerRef: ElementRef<HTMLDivElement> }
  ).containerRef = { nativeElement: container } as ElementRef<HTMLDivElement>;

  return { component, container };
}

/** Minimal SimpleChanges entry. */
const change = (previous: unknown, current: unknown): SimpleChange =>
  ({
    previousValue: previous,
    currentValue: current,
    firstChange: false,
    isFirstChange: () => false,
  }) as SimpleChange;

const itemEls = (container: HTMLElement) =>
  Array.from(container.children) as HTMLElement[];

let created: MasonrySnapGridComponent<Item>[] = [];

beforeEach(() => {
  created = [];
});

afterEach(() => {
  created.forEach((c) => c.ngOnDestroy());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function boot(
  overrides: Partial<MasonrySnapGridComponent<Item>> = {}
): ReturnType<typeof makeComponent> {
  const made = makeComponent(overrides);
  made.component.ngAfterViewInit();
  created.push(made.component);
  return made;
}

describe('Angular MasonrySnapGridComponent lifecycle', () => {
  it('renders items into the container on ngAfterViewInit', () => {
    const { container } = boot();
    expect(itemEls(container)).toHaveLength(3);
    expect(container.textContent).toContain('Item 0');
  });

  it('applies masonry positioning to the rendered items', () => {
    const { container } = boot();
    const first = itemEls(container)[0];

    // 800px container, 16px gutter, 250px minimum -> 3 columns of 256px.
    expect(first.style.position).toBe('absolute');
    expect(first.style.width).toBe('256px');
    expect(first.style.transform).toBe('translate(0px, 0px)');
  });

  it('does nothing on ngOnChanges before the view is initialised', () => {
    const { component, container } = makeComponent();
    expect(() =>
      component.ngOnChanges({ items: change([], makeItems(5)) } as SimpleChanges)
    ).not.toThrow();
    expect(itemEls(container)).toHaveLength(0);
  });

  it('clears the container on ngOnDestroy', () => {
    const { component, container } = boot();
    component.ngOnDestroy();
    created.length = 0;
    expect(itemEls(container)).toHaveLength(0);
  });

  it('emits layout after a layout pass', () => {
    const emitted: LayoutInfo[] = [];
    const { component } = makeComponent();
    component.layout.subscribe((info) => emitted.push(info));
    component.ngAfterViewInit();
    created.push(component);

    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1]).toMatchObject({
      columnCount: 3,
      columnWidth: 256,
      itemCount: 3,
      engine: 'js',
    });
  });

  it('exposes a refresh method', () => {
    const { component } = boot();
    expect(() => component.refresh()).not.toThrow();
  });
});

describe('Angular MasonrySnapGridComponent input forwarding', () => {
  it('re-renders when items change', () => {
    const { component, container } = boot();

    component.items = makeItems(6);
    component.ngOnChanges({
      items: change(makeItems(3), component.items),
    } as SimpleChanges);

    expect(itemEls(container)).toHaveLength(6);
  });

  it('forwards a gutter change', () => {
    // Previously only `items` was handled, so binding [gutter] to a signal or
    // form control silently did nothing after the first render.
    const { component, container } = boot();
    expect(itemEls(container)[1].style.transform).toBe('translate(272px, 0px)');

    component.gutter = 0;
    component.ngOnChanges({ gutter: change(16, 0) } as SimpleChanges);

    // With no gutter, 3 columns of 800/3 -> second column starts at 266.66px.
    expect(itemEls(container)[1].style.transform).toContain('translate(266.6');
  });

  it('forwards a minColWidth change', () => {
    const { component, container } = boot();
    expect(itemEls(container)[0].style.width).toBe('256px');

    // floor((800 + 16) / (390 + 16)) = 2 columns of (800 - 16) / 2 = 392px.
    component.minColWidth = 390;
    component.ngOnChanges({ minColWidth: change(250, 390) } as SimpleChanges);

    expect(itemEls(container)[0].style.width).toBe('392px');
  });

  it('forwards an explicit columns change', () => {
    const { component, container } = boot();

    component.columns = 2;
    component.ngOnChanges({ columns: change(undefined, 2) } as SimpleChanges);

    expect(itemEls(container)[0].style.width).toBe('392px');
  });

  it('forwards a columns breakpoint map', () => {
    const { component, container } = boot();

    component.columns = { 0: 1, 640: 2 };
    component.ngOnChanges({
      columns: change(undefined, component.columns),
    } as SimpleChanges);

    // The container measures 800px, so the 640 breakpoint wins -> 2 columns.
    expect(itemEls(container)[0].style.width).toBe('392px');
  });

  it('forwards an animate change', () => {
    const { component, container } = boot({ animate: true });
    expect(itemEls(container)[0].style.transition).toContain('transform');

    component.animate = false;
    component.ngOnChanges({ animate: change(true, false) } as SimpleChanges);

    expect(itemEls(container)[0].style.transition).toBe('');
  });

  it('forwards a transitionDuration change', () => {
    const { component, container } = boot();

    component.transitionDuration = 900;
    component.ngOnChanges({
      transitionDuration: change(400, 900),
    } as SimpleChanges);

    expect(itemEls(container)[0].style.transition).toContain('900ms');
  });

  it('forwards a renderItem change by rebuilding the items', () => {
    const { component, container } = boot();

    component.renderItem = (item: Item): HTMLElement => {
      const el = document.createElement('span');
      el.textContent = `changed ${item.title}`;
      return el;
    };
    component.ngOnChanges({
      renderItem: change(renderItem, component.renderItem),
    } as SimpleChanges);

    expect(itemEls(container)[0].tagName).toBe('SPAN');
    expect(container.textContent).toContain('changed Item 0');
  });

  it('handles a combined items and option change in one pass', () => {
    const { component, container } = boot();

    component.items = makeItems(4);
    component.columns = 2;
    component.ngOnChanges({
      items: change(makeItems(3), component.items),
      columns: change(undefined, 2),
    } as SimpleChanges);

    expect(itemEls(container)).toHaveLength(4);
    expect(itemEls(container)[0].style.width).toBe('392px');
  });

  it('ignores changes to inputs the engine does not consume', () => {
    const { component, container } = boot();
    const before = itemEls(container)[0].style.transform;

    component.ngOnChanges({
      somethingElse: change(1, 2),
    } as unknown as SimpleChanges);

    expect(itemEls(container)[0].style.transform).toBe(before);
  });
});

describe('Angular MasonrySnapGridComponent item identity', () => {
  it('reuses DOM nodes across updates when getItemKey is supplied', () => {
    // Rebuilding every node on each update discards focus, text selection,
    // scroll position inside items, and in-flight media playback.
    const items = makeItems(3);
    const { component, container } = boot({
      items,
      getItemKey: (item: Item) => item.id,
    });

    const before = container.querySelector('[data-testid="item-2"]');

    component.items = [{ id: 99, title: 'Item 99' }, ...items];
    component.ngOnChanges({
      items: change(items, component.items),
    } as SimpleChanges);

    expect(container.querySelector('[data-testid="item-2"]')).toBe(before);
    expect(itemEls(container)).toHaveLength(4);
  });

  it('drops nodes whose keys disappear', () => {
    const items = makeItems(3);
    const { component, container } = boot({
      items,
      getItemKey: (item: Item) => item.id,
    });

    component.items = [items[0]];
    component.ngOnChanges({
      items: change(items, component.items),
    } as SimpleChanges);

    expect(itemEls(container)).toHaveLength(1);
    expect(container.querySelector('[data-testid="item-2"]')).toBeNull();
  });

  it('rebuilds nodes when no key is supplied', () => {
    const items = makeItems(3);
    const { component, container } = boot({ items });

    const before = container.querySelector('[data-testid="item-2"]');

    component.items = makeItems(3);
    component.ngOnChanges({
      items: change(items, component.items),
    } as SimpleChanges);

    expect(container.querySelector('[data-testid="item-2"]')).not.toBe(before);
  });
});
