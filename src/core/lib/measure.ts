import { createScheduler } from './schedule';

export interface ItemObserverOptions {
  /** Invoked, coalesced to once per frame, when any observed item's box changes. */
  onChange: () => void;
  /**
   * Also attach one-shot `load`/`error` listeners to images inside observed
   * items. Covers layouts where the wrapper's box does not change even though
   * its content settles. Default: true
   */
  watchImages?: boolean;
}

export interface ItemObserver {
  /** Start observing an element. Idempotent; `null` is ignored. */
  observe(el: HTMLElement | null): void;
  /** Stop observing a single element and drop its listeners. */
  unobserve(el: HTMLElement): void;
  /** Stop observing everything; the observer stays usable afterwards. */
  reset(): void;
  /** Tear down permanently. */
  disconnect(): void;
}

const NOOP_OBSERVER: ItemObserver = {
  observe: () => {},
  unobserve: () => {},
  reset: () => {},
  disconnect: () => {},
};

/**
 * Watch individual grid items for size changes and report them.
 *
 * This is what makes the grid self-healing. Item heights are measured once
 * during layout, but real content settles *after* that: images decode, fonts
 * swap, embeds resize, text reflows, collapsible sections open. Without this,
 * the only trigger for a fresh layout is a container **width** change — so an
 * image gallery lays out against zero-height images and stays broken until the
 * window happens to be resized.
 *
 * Every notification is funnelled through one animation-frame scheduler, so a
 * gallery of 200 images finishing at once costs a single relayout, not 200.
 */
export function createItemObserver(options: ItemObserverOptions): ItemObserver {
  const { onChange, watchImages = true } = options;

  if (typeof ResizeObserver === 'undefined') {
    // SSR and older browsers: layout still runs, it just cannot self-heal.
    return NOOP_OBSERVER;
  }

  const scheduler = createScheduler(onChange);

  /**
   * ResizeObserver delivers an initial callback for every newly observed
   * element. Those carry no new information — the element was just measured by
   * the layout pass that mounted it — so the first notification per element is
   * swallowed to avoid a redundant second pass on mount.
   */
  const primed = new WeakSet<Element>();
  const observed = new Set<HTMLElement>();
  const imageCleanups = new Map<HTMLElement, () => void>();

  /**
   * Set by `disconnect()`. A ResizeObserver callback already in flight, or a
   * listener mid-dispatch, must not be able to schedule work against a
   * component that has since unmounted.
   */
  let disposed = false;

  // Some polyfills implement only part of the interface; degrade instead of
  // throwing inside a user's render.
  const safeUnobserve = (el: HTMLElement): void => {
    if (typeof ro.unobserve === 'function') ro.unobserve(el);
  };

  const ro = new ResizeObserver((entries) => {
    if (disposed) return;
    let changed = false;

    for (const entry of entries) {
      if (!primed.has(entry.target)) {
        primed.add(entry.target);
        continue;
      }
      changed = true;
    }

    if (changed) scheduler.schedule();
  });

  const attachImageListeners = (el: HTMLElement): void => {
    if (!watchImages || imageCleanups.has(el)) return;

    const images = Array.from(el.querySelectorAll('img'));
    const pending = images.filter((img) => !img.complete);
    if (pending.length === 0) return;

    const settle = () => {
      if (!disposed) scheduler.schedule();
    };
    const detachers: Array<() => void> = [];

    for (const img of pending) {
      img.addEventListener('load', settle, { once: true });
      img.addEventListener('error', settle, { once: true });
      detachers.push(() => {
        img.removeEventListener('load', settle);
        img.removeEventListener('error', settle);
      });
    }

    imageCleanups.set(el, () => detachers.forEach((fn) => fn()));
  };

  const dropImageListeners = (el: HTMLElement): void => {
    const cleanup = imageCleanups.get(el);
    if (cleanup) {
      cleanup();
      imageCleanups.delete(el);
    }
  };

  return {
    observe(el: HTMLElement | null): void {
      if (disposed || !el || observed.has(el)) return;
      observed.add(el);
      ro.observe(el);
      attachImageListeners(el);
    },

    unobserve(el: HTMLElement): void {
      if (!observed.delete(el)) return;
      safeUnobserve(el);
      dropImageListeners(el);
    },

    reset(): void {
      observed.forEach((el) => {
        safeUnobserve(el);
        dropImageListeners(el);
      });
      observed.clear();
    },

    disconnect(): void {
      disposed = true;
      scheduler.cancel();
      imageCleanups.forEach((cleanup) => cleanup());
      imageCleanups.clear();
      observed.clear();
      ro.disconnect();
    },
  };
}
