/**
 * Shared test harness.
 *
 * This file runs for every suite, including the ones that deliberately execute
 * in a pure Node environment (`@vitest-environment node`) to exercise the real
 * server-rendering path. Everything DOM-dependent is therefore guarded — in
 * Node there is no `HTMLElement` to patch and no `document` for jest-dom.
 */
const HAS_DOM = typeof HTMLElement !== 'undefined';

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom');
}

if (HAS_DOM) {
  // jsdom does not implement layout, so offsetWidth/offsetHeight return 0.
  // Patch HTMLElement to return predictable non-zero values for layout tests.
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return parseInt(this.style.width, 10) || 800;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return parseInt(this.style.height, 10) || 200;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return parseInt(this.style.width, 10) || 800;
    },
  });
}

/**
 * Set `window.scrollY`. jsdom does not scroll, so this is the only way to
 * simulate a scrolled page.
 */
export function setScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    value,
    writable: true,
    configurable: true,
  });
}

/**
 * Make an element report browser-accurate scroll geometry.
 *
 * jsdom's `getBoundingClientRect()` is hard-coded to all zeros, which quietly
 * breaks any virtualization assertion: the production code derives the
 * container's document offset from `rect.top + window.scrollY`, so a constant
 * `top: 0` makes that offset track `scrollY` and cancel it out — the visible
 * window then never moves no matter how far you scroll. A real browser reports
 * a `top` that *decreases* as the page scrolls, keeping the sum constant.
 *
 * @param el          element to patch
 * @param documentTop the element's fixed offset from the top of the document
 * @param height      the element's rendered height
 */
export function mockRectGeometry(
  el: HTMLElement,
  documentTop: number,
  height = 0
): void {
  el.getBoundingClientRect = () => {
    const top = documentTop - window.scrollY;
    return {
      top,
      bottom: top + height,
      left: 0,
      right: 0,
      width: parseInt(el.style.width, 10) || 800,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

/**
 * Wait long enough for jsdom's timer-backed `requestAnimationFrame` to fire.
 * Scroll and resize updates are coalesced into animation frames, so assertions
 * that follow an event must yield at least one frame.
 */
export function flushFrames(count = 2): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20 * count));
}

/**
 * Controllable ResizeObserver stand-in.
 *
 * jsdom ships no ResizeObserver at all, so without this the self-healing
 * measurement path is silently inert in tests. Mirrors the part of the real
 * contract that matters: observing an element delivers an immediate callback
 * carrying its current size.
 */
export class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly observed = new Set<Element>();

  constructor(private cb: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.observed.add(el);
    this.emit([el]);
  }

  unobserve(el: Element): void {
    this.observed.delete(el);
  }

  disconnect(): void {
    this.observed.clear();
  }

  /** Simulate a real size change on the given elements. */
  emit(els: Element[]): void {
    this.cb(
      els.map(
        (target) =>
          ({
            target,
            // Real entries always carry a contentRect; consumers read it.
            contentRect: {
              width: parseInt((target as HTMLElement).style.width, 10) || 800,
              height: parseInt((target as HTMLElement).style.height, 10) || 200,
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              x: 0,
              y: 0,
            },
          }) as unknown as ResizeObserverEntry
      ),
      this as unknown as ResizeObserver
    );
  }

  static get last(): MockResizeObserver {
    return this.instances[this.instances.length - 1];
  }

  /** Every observer that has an element observed, newest first. */
  static get active(): MockResizeObserver[] {
    return [...this.instances].reverse().filter((o) => o.observed.size > 0);
  }
}

/**
 * Install {@link MockResizeObserver} globally.
 * @returns a restore function; call it in `afterEach`.
 */
export function installMockResizeObserver(): () => void {
  const original = globalThis.ResizeObserver;
  MockResizeObserver.instances = [];
  globalThis.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  return () => {
    globalThis.ResizeObserver = original;
    MockResizeObserver.instances = [];
  };
}

/** An image that reports itself as still decoding, which jsdom never does. */
export function makePendingImage(): HTMLImageElement {
  const img = document.createElement('img');
  Object.defineProperty(img, 'complete', { value: false, configurable: true });
  return img;
}
