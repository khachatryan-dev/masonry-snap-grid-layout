import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createItemObserver } from '../src/core/lib/measure';
import { createScheduler } from '../src/core/lib/schedule';
import {
  flushFrames,
  installMockResizeObserver,
  makePendingImage,
  MockResizeObserver,
} from './setup';

let restoreResizeObserver: () => void;

beforeEach(() => {
  restoreResizeObserver = installMockResizeObserver();
});

afterEach(() => {
  restoreResizeObserver();
  vi.restoreAllMocks();
});

const makeItem = () => document.createElement('div');

describe('createItemObserver', () => {
  it('degrades to a no-op without ResizeObserver support', () => {
    globalThis.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });

    expect(() => {
      obs.observe(makeItem());
      obs.reset();
      obs.disconnect();
    }).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores the initial callback that observing an element produces', async () => {
    // That first notification carries no news — the layout pass that mounted
    // the element already measured it. Acting on it would double every pass.
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });

    obs.observe(makeItem());
    await flushFrames();

    expect(onChange).not.toHaveBeenCalled();
    obs.disconnect();
  });

  it('reports a genuine size change', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();

    obs.observe(el);
    MockResizeObserver.last.emit([el]);
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    obs.disconnect();
  });

  it('coalesces a burst of item resizes into a single relayout', async () => {
    // The gallery case: 200 images finishing at once must cost one layout.
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const els = Array.from({ length: 200 }, makeItem);

    els.forEach((el) => obs.observe(el));
    els.forEach((el) => MockResizeObserver.last.emit([el]));
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    obs.disconnect();
  });

  it('is idempotent per element', () => {
    const obs = createItemObserver({ onChange: vi.fn() });
    const el = makeItem();

    obs.observe(el);
    obs.observe(el);
    obs.observe(el);

    expect(MockResizeObserver.last.observed.size).toBe(1);
    obs.disconnect();
  });

  it('ignores a null element', () => {
    const obs = createItemObserver({ onChange: vi.fn() });
    expect(() => obs.observe(null)).not.toThrow();
    obs.disconnect();
  });

  it('stops reporting an unobserved element', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();

    obs.observe(el);
    obs.unobserve(el);
    expect(MockResizeObserver.last.observed.has(el)).toBe(false);

    await flushFrames();
    expect(onChange).not.toHaveBeenCalled();
    obs.disconnect();
  });

  it('survives a ResizeObserver polyfill without unobserve', () => {
    // Partial polyfills exist; throwing here would crash a user's render.
    class PartialRO {
      constructor(_cb: ResizeObserverCallback) {}
      observe(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = PartialRO as unknown as typeof ResizeObserver;

    const obs = createItemObserver({ onChange: vi.fn() });
    const el = makeItem();
    obs.observe(el);

    expect(() => obs.unobserve(el)).not.toThrow();
    expect(() => obs.disconnect()).not.toThrow();
  });

  it('relayouts when a pending image finishes loading', async () => {
    // The headline failure this exists to prevent: heights measured against
    // not-yet-decoded images, with nothing to correct them afterwards.
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();
    const img = makePendingImage();
    el.appendChild(img);

    obs.observe(el);
    img.dispatchEvent(new Event('load'));
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    obs.disconnect();
  });

  it('relayouts when an image fails, so the gap is reclaimed', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();
    const img = makePendingImage();
    el.appendChild(img);

    obs.observe(el);
    img.dispatchEvent(new Event('error'));
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    obs.disconnect();
  });

  it('coalesces many image loads into one relayout', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();
    const imgs = Array.from({ length: 50 }, () => {
      const img = makePendingImage();
      el.appendChild(img);
      return img;
    });

    obs.observe(el);
    imgs.forEach((img) => img.dispatchEvent(new Event('load')));
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    obs.disconnect();
  });

  it('skips already-complete images', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: true, configurable: true });
    el.appendChild(img);

    obs.observe(el);
    img.dispatchEvent(new Event('load'));
    await flushFrames();

    expect(onChange).not.toHaveBeenCalled();
    obs.disconnect();
  });

  it('does not watch images when watchImages is false', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange, watchImages: false });
    const el = makeItem();
    const img = makePendingImage();
    el.appendChild(img);

    obs.observe(el);
    img.dispatchEvent(new Event('load'));
    await flushFrames();

    expect(onChange).not.toHaveBeenCalled();
    obs.disconnect();
  });

  it('reports nothing after disconnect', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();
    const img = makePendingImage();
    el.appendChild(img);

    obs.observe(el);
    const ro = MockResizeObserver.last;
    obs.disconnect();

    ro.emit([el]);
    img.dispatchEvent(new Event('load'));
    await flushFrames();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('stays usable after reset', async () => {
    const onChange = vi.fn();
    const obs = createItemObserver({ onChange });
    const el = makeItem();

    obs.observe(el);
    obs.reset();
    expect(MockResizeObserver.last.observed.size).toBe(0);

    obs.observe(el);
    MockResizeObserver.last.emit([el]);
    await flushFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    obs.disconnect();
  });
});

describe('createScheduler', () => {
  it('runs the callback once for many schedule calls', async () => {
    const fn = vi.fn();
    const s = createScheduler(fn);

    for (let i = 0; i < 50; i++) s.schedule();
    expect(fn).not.toHaveBeenCalled();

    await flushFrames();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('can be scheduled again after firing', async () => {
    const fn = vi.fn();
    const s = createScheduler(fn);

    s.schedule();
    await flushFrames();
    s.schedule();
    await flushFrames();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('flush runs immediately and consumes the pending frame', async () => {
    const fn = vi.fn();
    const s = createScheduler(fn);

    s.schedule();
    s.flush();
    expect(fn).toHaveBeenCalledTimes(1);

    await flushFrames();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel drops the pending run', async () => {
    const fn = vi.fn();
    const s = createScheduler(fn);

    s.schedule();
    s.cancel();
    await flushFrames();

    expect(fn).not.toHaveBeenCalled();
  });
});
