import { createScheduler } from './schedule';
import { EMPTY_SCROLL_STATE, type ScrollState } from '../model/types';

export type { ScrollState };
export { EMPTY_SCROLL_STATE };

/**
 * Anything that can act as the scrolling viewport for virtualization.
 * `'window'` (or omitting it) uses the page scroll; an element enables
 * virtualization inside an `overflow: auto` panel, modal, or dashboard pane.
 */
export type ScrollTargetOption =
  | Window
  | HTMLElement
  | null
  | undefined
  | 'window'
  | (() => Window | HTMLElement | null);

/** Narrow a {@link ScrollTargetOption} to a concrete, live target. */
export function resolveScrollTarget(
  option: ScrollTargetOption
): Window | HTMLElement | null {
  if (typeof window === 'undefined') return null;
  if (option === 'window' || option == null) return window;
  if (typeof option === 'function') {
    const resolved = option();
    return resolved ?? window;
  }
  return option;
}

/**
 * Duck-type rather than using `instanceof Window`, which is false across
 * realms (iframes, jsdom, SSR shims). Only DOM nodes carry `nodeType`.
 */
const isWindow = (t: Window | HTMLElement): t is Window =>
  typeof (t as unknown as { nodeType?: number }).nodeType !== 'number';

/**
 * Read current scroll geometry. Performs one `getBoundingClientRect()` on the
 * container, so callers should batch this into an animation frame rather than
 * invoking it per scroll event.
 */
export function readScrollState(
  target: Window | HTMLElement | null,
  container: HTMLElement | null
): ScrollState {
  if (!target || !container) return EMPTY_SCROLL_STATE;

  const rect = container.getBoundingClientRect();

  if (isWindow(target)) {
    return {
      scrollOffset: target.scrollY,
      viewportSize: target.innerHeight,
      containerOffset: rect.top + target.scrollY,
    };
  }

  const targetRect = target.getBoundingClientRect();
  return {
    scrollOffset: target.scrollTop,
    viewportSize: target.clientHeight,
    containerOffset: rect.top - targetRect.top + target.scrollTop,
  };
}

export function scrollStatesEqual(a: ScrollState, b: ScrollState): boolean {
  return (
    a.scrollOffset === b.scrollOffset &&
    a.viewportSize === b.viewportSize &&
    a.containerOffset === b.containerOffset
  );
}

/**
 * Observe scroll and resize on `target`, reporting geometry changes.
 *
 * Events are coalesced into at most one report per animation frame, and the
 * container's offset is re-read on every frame — so a sticky header collapsing
 * mid-scroll cannot desynchronise the visible window. Identical consecutive
 * states are suppressed to avoid pointless re-renders.
 *
 * @returns a dispose function that removes every listener.
 */
export function createScrollTracker(
  target: Window | HTMLElement | null,
  getContainer: () => HTMLElement | null,
  onChange: (state: ScrollState) => void
): () => void {
  if (!target) return () => {};

  let last: ScrollState | null = null;

  const measure = (): void => {
    const next = readScrollState(target, getContainer());
    if (last && scrollStatesEqual(last, next)) return;
    last = next;
    onChange(next);
  };

  const scheduler = createScheduler(measure);
  const onEvent = () => scheduler.schedule();

  target.addEventListener('scroll', onEvent, { passive: true });

  // Element targets do not emit window resize, but the page resizing can still
  // change their box, so listen on both where available.
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onEvent);
  }

  // Prime synchronously so the first paint has real geometry.
  measure();

  return () => {
    scheduler.cancel();
    target.removeEventListener('scroll', onEvent);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onEvent);
    }
  };
}
