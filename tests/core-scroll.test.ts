import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createScrollTracker,
  readScrollState,
  resolveScrollTarget,
  scrollStatesEqual,
  EMPTY_SCROLL_STATE,
} from '../src/core/lib/scroll';
import { mockRectGeometry, setScrollY, flushFrames } from './setup';

afterEach(() => {
  setScrollY(0);
  vi.restoreAllMocks();
});

/** An element standing in for an `overflow: auto` scroll container. */
function makeScrollBox(clientHeight: number, scrollTop = 0): HTMLElement {
  const box = document.createElement('div');
  Object.defineProperty(box, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
  box.scrollTop = scrollTop;
  return box;
}

describe('resolveScrollTarget', () => {
  it('defaults to the window', () => {
    expect(resolveScrollTarget(undefined)).toBe(window);
    expect(resolveScrollTarget(null)).toBe(window);
    expect(resolveScrollTarget('window')).toBe(window);
  });

  it('passes an element straight through', () => {
    const el = document.createElement('div');
    expect(resolveScrollTarget(el)).toBe(el);
  });

  it('calls a getter and falls back to the window when it yields nothing', () => {
    const el = document.createElement('div');
    expect(resolveScrollTarget(() => el)).toBe(el);
    expect(resolveScrollTarget(() => null)).toBe(window);
  });
});

describe('readScrollState', () => {
  it('returns an empty state without a target or container', () => {
    expect(readScrollState(null, document.createElement('div'))).toEqual(
      EMPTY_SCROLL_STATE
    );
    expect(readScrollState(window, null)).toEqual(EMPTY_SCROLL_STATE);
  });

  it('treats the window as the viewport', () => {
    const container = document.createElement('div');
    mockRectGeometry(container, 1000);
    setScrollY(200);

    const state = readScrollState(window, container);
    expect(state.scrollOffset).toBe(200);
    expect(state.viewportSize).toBe(window.innerHeight);
    // rect.top (800) + scrollY (200) — the container's fixed document offset.
    expect(state.containerOffset).toBe(1000);
  });

  it('keeps the container offset stable as the page scrolls', () => {
    const container = document.createElement('div');
    mockRectGeometry(container, 1000);

    setScrollY(0);
    const a = readScrollState(window, container);
    setScrollY(750);
    const b = readScrollState(window, container);

    // The grid did not move in the document, only the viewport did.
    expect(a.containerOffset).toBe(b.containerOffset);
    expect(b.scrollOffset - a.scrollOffset).toBe(750);
  });

  it('reads geometry from an element scroll container', () => {
    // This is the case that simply did not work before: virtualizing inside an
    // `overflow: auto` panel rather than the page.
    const box = makeScrollBox(400, 120);
    const container = document.createElement('div');
    box.appendChild(container);

    box.getBoundingClientRect = () => ({ top: 50 }) as DOMRect;
    container.getBoundingClientRect = () => ({ top: 30 }) as DOMRect;

    const state = readScrollState(box, container);
    expect(state.scrollOffset).toBe(120);
    expect(state.viewportSize).toBe(400);
    // 30 - 50 + 120 -> the container's offset within the box's scroll content.
    expect(state.containerOffset).toBe(100);
  });

  it('identifies the window without relying on instanceof', () => {
    // `instanceof Window` is false across realms (iframes, jsdom, SSR shims),
    // so the window branch must be selected by duck-typing instead.
    const container = document.createElement('div');
    mockRectGeometry(container, 0);
    const fakeWindow = {
      scrollY: 42,
      innerHeight: 500,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Window;

    const state = readScrollState(fakeWindow, container);
    expect(state.scrollOffset).toBe(42);
    expect(state.viewportSize).toBe(500);
  });
});

describe('scrollStatesEqual', () => {
  it('compares every field', () => {
    const a = { scrollOffset: 1, viewportSize: 2, containerOffset: 3 };
    expect(scrollStatesEqual(a, { ...a })).toBe(true);
    expect(scrollStatesEqual(a, { ...a, scrollOffset: 9 })).toBe(false);
    expect(scrollStatesEqual(a, { ...a, viewportSize: 9 })).toBe(false);
    expect(scrollStatesEqual(a, { ...a, containerOffset: 9 })).toBe(false);
  });
});

describe('createScrollTracker', () => {
  it('is a no-op for a missing target', () => {
    const onChange = vi.fn();
    const dispose = createScrollTracker(null, () => null, onChange);
    expect(onChange).not.toHaveBeenCalled();
    expect(() => dispose()).not.toThrow();
  });

  it('reports initial geometry synchronously', () => {
    const container = document.createElement('div');
    mockRectGeometry(container, 500);
    const onChange = vi.fn();

    const dispose = createScrollTracker(window, () => container, onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].containerOffset).toBe(500);
    dispose();
  });

  it('coalesces a burst of scroll events into one update per frame', async () => {
    const container = document.createElement('div');
    mockRectGeometry(container, 0);
    const onChange = vi.fn();
    const dispose = createScrollTracker(window, () => container, onChange);
    onChange.mockClear();

    // A real scroll gesture fires dozens of events; unthrottled, each one was
    // a state update plus a forced reflow.
    setScrollY(300);
    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('scroll'));

    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].scrollOffset).toBe(300);
    dispose();
  });

  it('suppresses updates when the geometry has not changed', async () => {
    const container = document.createElement('div');
    mockRectGeometry(container, 0);
    const onChange = vi.fn();
    const dispose = createScrollTracker(window, () => container, onChange);
    onChange.mockClear();

    window.dispatchEvent(new Event('scroll'));
    await flushFrames();

    expect(onChange).not.toHaveBeenCalled();
    dispose();
  });

  it('re-reads the container offset on every frame', async () => {
    // A sticky header collapsing mid-scroll moves the grid within the document.
    // If the offset were cached at subscribe time, the visible window would
    // silently drift out of alignment.
    const container = document.createElement('div');
    let documentTop = 1000;
    container.getBoundingClientRect = () =>
      ({ top: documentTop - window.scrollY }) as DOMRect;

    const onChange = vi.fn();
    const dispose = createScrollTracker(window, () => container, onChange);
    onChange.mockClear();

    documentTop = 400;
    setScrollY(10);
    window.dispatchEvent(new Event('scroll'));
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].containerOffset).toBe(400);
    dispose();
  });

  it('stops reporting after dispose', async () => {
    const container = document.createElement('div');
    mockRectGeometry(container, 0);
    const onChange = vi.fn();
    const dispose = createScrollTracker(window, () => container, onChange);

    dispose();
    onChange.mockClear();

    setScrollY(900);
    window.dispatchEvent(new Event('scroll'));
    await flushFrames();

    expect(onChange).not.toHaveBeenCalled();
  });
});
