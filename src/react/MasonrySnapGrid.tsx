import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canVirtualize,
  computeLayout,
  computeVisibleIndices,
  createHeightCache,
  createItemObserver,
  createScheduler,
  createScrollTracker,
  EMPTY_SCROLL_STATE,
  resolveColumnCount,
  resolveScrollTarget,
  supportsCss,
  type ColumnsOption,
  type HeightCache,
  type ItemObserver,
  type ItemPosition,
  type LayoutInfo,
  type LayoutMode,
  type Scheduler,
  type ScrollState,
} from '../core';

/**
 * Anything the component accepts as the scrolling viewport, including a React
 * ref so the common `useRef<HTMLDivElement>(null)` case works directly.
 */
export type ReactScrollTarget =
  | Window
  | HTMLElement
  | 'window'
  | null
  | React.RefObject<HTMLElement | null>
  | (() => Window | HTMLElement | null);

/**
 * Public component props
 */
export interface MasonrySnapGridProps<T> {
  /** Data items to render */
  items: T[];

  /**
   * Layout engine strategy
   * - 'auto' (default) -> use CSS masonry if supported
   * - 'js' -> always use JS masonry
   */
  layoutMode?: LayoutMode;

  /** Space between items (px) */
  gutter?: number;

  /** Minimum column width (px) */
  minColWidth?: number;

  /**
   * Fixed column count, or a mobile-first breakpoint map of
   * `minContainerWidth -> columns`, e.g. `{ 0: 1, 640: 2, 1024: 3 }`.
   * Overrides `minColWidth` when provided.
   */
  columns?: ColumnsOption;

  /** Enable transform transition animations */
  animate?: boolean;

  /** Transition duration in milliseconds */
  transitionDuration?: number;

  /** Item renderer. Receives the item and its index. */
  renderItem: (item: T, index: number) => React.ReactNode;

  /**
   * Stable React key for an item. Strongly recommended when items can be
   * reordered, filtered, or prepended — the index-based fallback will otherwise
   * reuse a node (and its cached height) for whatever item now sits at that
   * position.
   */
  getItemKey?: (item: T, index: number) => React.Key;

  /** Optional container class */
  className?: string;

  /** Optional container styles */
  style?: React.CSSProperties;

  /** Enable scroll virtualization */
  virtualize?: boolean;

  /** Extra viewport buffer when virtualizing */
  overscan?: number;

  /**
   * The scrolling viewport used for virtualization. Defaults to the page.
   * Pass an element or a ref to virtualize inside an `overflow: auto`
   * container. Inline functions should be memoized, as a new identity
   * resubscribes the scroll listeners.
   */
  scrollContainer?: ReactScrollTarget;

  /**
   * Assumed item height in pixels before measurement.
   *
   * Without it, virtualization must mount every item once to learn its height,
   * which defeats the purpose for very large lists. With it, positions are
   * estimated up front and refined as real heights arrive.
   */
  estimatedItemHeight?: number;

  /**
   * Watch each item for size changes so the layout self-heals when content
   * settles after first measurement — images decoding, fonts swapping, embeds
   * resizing. Default: true
   */
  observeItemResize?: boolean;

  /** Also listen for image `load`/`error` inside items. Default: true */
  watchImages?: boolean;

  /** Called after every layout pass. */
  onLayout?: (info: LayoutInfo) => void;
}

function normalizeScrollTarget(
  target: ReactScrollTarget | undefined
): () => Window | HTMLElement | null {
  return () => {
    if (target && typeof target === 'object' && 'current' in target) {
      return resolveScrollTarget(target.current);
    }
    return resolveScrollTarget(target);
  };
}

/**
 * MasonrySnapGrid
 *
 * SSR friendly masonry grid that:
 * - renders SEO friendly markup on the server
 * - upgrades to CSS masonry when supported
 * - falls back to JS masonry positioning
 * - supports optional virtualization, in the page or in a scroll container
 *
 * Placement, visibility, scroll tracking, and measurement all come from the
 * framework-agnostic core in `src/core`, so behaviour matches the Vanilla and
 * Vue builds exactly.
 */
function MasonrySnapGrid<T>({
  items,
  layoutMode = 'auto',
  gutter = 16,
  minColWidth = 250,
  columns,
  animate = true,
  transitionDuration = 400,
  renderItem,
  getItemKey,
  className,
  style,
  virtualize = false,
  overscan = 300,
  scrollContainer,
  estimatedItemHeight,
  observeItemResize = true,
  watchImages = true,
  onLayout,
}: MasonrySnapGridProps<T>) {
  /** Container DOM reference */
  const containerRef = useRef<HTMLDivElement>(null);

  /** Refs to individual item elements, indexed by item position. */
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Stable per-index ref callbacks.
   *
   * Inline `ref={el => ...}` closures change identity every render, which makes
   * React detach and reattach every ref — churning the item observer on each
   * pass. Caching one callback per index keeps attachment stable.
   */
  const refCallbacks = useRef<Array<(el: HTMLDivElement | null) => void>>([]);

  /**
   * Measured item heights, cached by item key rather than by index so that a
   * height follows its item through prepends, reorders, and filters.
   */
  const heightCacheRef = useRef<HeightCache>(createHeightCache());

  /** Previous container width, so height-only changes do not relayout. */
  const prevWidthRef = useRef(0);

  /**
   * Stable indirection to the latest layout function, so effects can invoke it
   * without listing it as a dependency and resubscribing every render.
   *
   * Assigned during render rather than from a layout effect: `useLayoutEffect`
   * cannot run on the server and React warns for every component that
   * schedules one, which pollutes every SSR build log. Writing a ref that is
   * only ever read from effects and callbacks is safe during render.
   */
  const computeLayoutRef = useRef<() => void>(() => {});

  /** Live item observer, shared by every mounted item. */
  const itemObserverRef = useRef<ItemObserver | null>(null);

  /**
   * Follow-up layout pass, for when a measurement round learned something but
   * left items still unmeasured.
   *
   * A pass can only measure what is mounted. When every cached height is
   * invalidated at once — a column-width change does that — the items that are
   * then forced back into the DOM to be re-measured only exist *after* the
   * render that pass triggers, so one more pass is needed to read them. It is
   * gated on having learned a new height, which is what makes it terminate:
   * an item that genuinely measures zero never counts as progress.
   */
  const remeasureRef = useRef<Scheduler | null>(null);
  if (!remeasureRef.current) {
    remeasureRef.current = createScheduler(() => computeLayoutRef.current());
  }

  /** Latest onLayout callback, kept out of effect dependencies. */
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;

  /** Client mount detection (avoids SSR mismatch) */
  const [isMounted, setIsMounted] = useState(false);

  /** Calculated positions for each item */
  const [positions, setPositions] = useState<ItemPosition[]>([]);

  /** Total container height (used when JS positioning is active) */
  const [containerHeight, setContainerHeight] = useState(0);

  /** Whether native CSS masonry should be used */
  const [useCss, setUseCss] = useState(false);

  /** Latest scroll geometry, updated at most once per frame. */
  const [scroll, setScroll] = useState<ScrollState>(EMPTY_SCROLL_STATE);

  /** Container width, tracked only when CSS mode needs it for breakpoints. */
  const [cssWidth, setCssWidth] = useState(0);

  const hasEstimate =
    typeof estimatedItemHeight === 'number' && estimatedItemHeight > 0;

  /**
   * Item identity. Declared ahead of the layout pass because the height cache
   * is keyed by it, not by index.
   */
  const keyFor = useCallback(
    (item: T, i: number): React.Key => (getItemKey ? getItemKey(item, i) : i),
    [getItemKey]
  );

  /**
   * Item identity. Declared ahead of the layout pass because the height cache
   * is keyed by it, not by index.
   */
  /**
   * Detect client mount and CSS masonry support
   */
  useEffect(() => {
    setIsMounted(true);

    if (layoutMode !== 'js') {
      setUseCss(supportsCss('grid-template-rows', 'masonry'));
    } else {
      setUseCss(false);
    }
  }, [layoutMode]);

  /**
   * Keep the per-index bookkeeping arrays in step with the item count.
   */
  useEffect(() => {
    itemRefs.current.length = items.length;
    refCallbacks.current.length = items.length;
  }, [items]);

  /**
   * Core masonry layout pass.
   *
   * Reads every mounted item's height, then delegates placement to the shared
   * core so the maths is identical across all adapters.
   */
  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) return;

    const cache = heightCacheRef.current;
    const keys = items.map(keyFor);

    // Heights for items that no longer exist would otherwise accumulate for
    // the lifetime of the grid.
    cache.retain(keys);

    const knownBefore = cache.size;

    // Measure whatever is currently mounted; virtualized-away items keep
    // their previously cached height.
    itemRefs.current.slice(0, items.length).forEach((el, i) => {
      if (el) cache.set(keys[i], el.offsetHeight);
    });

    const heights = cache.read(keys);

    const result = computeLayout_(
      items.length,
      heights,
      containerWidth,
      gutter,
      minColWidth,
      columns,
      hasEstimate ? estimatedItemHeight : 0
    );

    // Items still waiting on a height will have been forced into the DOM by
    // the render this pass triggers; come back once they are mounted.
    if (cache.size > knownBefore && heights.some((h) => h === undefined)) {
      remeasureRef.current?.schedule();
    }

    setPositions(result.positions);
    setContainerHeight(result.containerHeight);

    onLayoutRef.current?.({
      columnCount: result.columnCount,
      columnWidth: result.columnWidth,
      containerHeight: result.containerHeight,
      itemCount: items.length,
      engine: 'js',
    });
  }, [
    items,
    keyFor,
    gutter,
    minColWidth,
    columns,
    hasEstimate,
    estimatedItemHeight,
  ]);

  // Point the indirection at this render's closure. See the ref's declaration
  // for why this is done during render rather than in a layout effect.
  computeLayoutRef.current = computeLayout;

  /**
   * Run layout on mount and whenever layout inputs change.
   */
  useEffect(() => {
    if (!isMounted || useCss) return;
    computeLayoutRef.current();
  }, [isMounted, useCss, items, gutter, minColWidth, columns]);

  /**
   * Per-item observation: makes the layout self-healing.
   */
  useEffect(() => {
    if (!isMounted || useCss || !observeItemResize) return;

    const observer = createItemObserver({
      onChange: () => computeLayoutRef.current(),
      watchImages,
    });
    itemObserverRef.current = observer;

    // Adopt items that mounted before this effect ran.
    itemRefs.current.forEach((el) => el && observer.observe(el));

    return () => {
      observer.disconnect();
      itemObserverRef.current = null;
    };
  }, [isMounted, useCss, observeItemResize, watchImages]);

  /** Drop any pending follow-up pass on unmount. */
  useEffect(() => () => remeasureRef.current?.cancel(), []);

  /**
   * Container ResizeObserver.
   *
   * Only width changes invalidate the layout — reacting to height would create
   * a feedback loop, since layout sets the container's height itself.
   */
  useEffect(() => {
    if (!isMounted) return;

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const scheduler = createScheduler(() => {
      // Column width changed, so every cached height is now stale.
      heightCacheRef.current.clear();
      computeLayoutRef.current();
    });

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (prevWidthRef.current === width) return;
      prevWidthRef.current = width;

      if (useCss) {
        setCssWidth(width);
        return;
      }
      scheduler.schedule();
    });

    observer.observe(container);

    return () => {
      scheduler.cancel();
      observer.disconnect();
    };
  }, [isMounted, useCss]);

  /**
   * Scroll + viewport tracking for virtualization.
   *
   * Delegated to the shared tracker, which coalesces events into one update
   * per animation frame and re-reads the container offset each frame so a
   * sticky header collapsing mid-scroll cannot desynchronise the window.
   */
  useEffect(() => {
    if (!virtualize || !isMounted || useCss) return;

    const target = normalizeScrollTarget(scrollContainer)();
    return createScrollTracker(target, () => containerRef.current, setScroll);
  }, [virtualize, isMounted, useCss, scrollContainer]);

  /**
   * Which items are inside the viewport, or `null` when everything renders.
   */
  const visibleIndices = useMemo<Set<number> | null>(() => {
    if (!canVirtualize({ virtualize, itemCount: items.length })) return null;

    // `positions` may be shorter than `items` on the render that follows an
    // items change, and some items may be unmeasured. Both cases are handled
    // per-item by the core, which forces those items to render rather than
    // abandoning virtualization for the whole list.
    return computeVisibleIndices({
      count: items.length,
      positions,
      heights: heightCacheRef.current.read(items.map(keyFor)),
      scroll,
      overscan,
      fallbackHeight: hasEstimate ? estimatedItemHeight : 0,
    });
  }, [
    virtualize,
    hasEstimate,
    estimatedItemHeight,
    items,
    keyFor,
    positions,
    scroll,
    overscan,
  ]);

  /**
   * Stable ref callback per index, wiring each element into the item observer.
   */
  const getRefCallback = (i: number) => {
    let cb = refCallbacks.current[i];
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        const prev = itemRefs.current[i];
        if (prev && prev !== el) itemObserverRef.current?.unobserve(prev);
        itemRefs.current[i] = el;
        if (el) itemObserverRef.current?.observe(el);
      };
      refCallbacks.current[i] = cb;
    }
    return cb;
  };

  /**
   * CSS Masonry mode — the browser does the placement, so no JS layout runs.
   */
  if (isMounted && useCss) {
    const explicitColumns =
      columns === undefined
        ? undefined
        : resolveColumnCount(cssWidth || containerRef.current?.offsetWidth || 0, {
            columns,
            minColWidth,
            gutter,
          });

    return (
      <div
        ref={containerRef}
        className={`msgl-container msgl-container--css${
          className ? ` ${className}` : ''
        }`}
        style={
          {
            '--msgl-gutter': `${gutter}px`,
            '--msgl-min-col-width': `${minColWidth}px`,
            ...(explicitColumns
              ? {
                  gridTemplateColumns: `repeat(${explicitColumns}, minmax(0, 1fr))`,
                }
              : null),
            ...style,
          } as React.CSSProperties
        }
      >
        {items.map((item, i) => (
          <div key={keyFor(item, i)} className="msgl-item">
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  }

  /**
   * Keep the container's height as soon as one has been computed, rather than
   * only while `positions` matches `items` exactly. During the render that
   * follows an append the two disagree for one frame, and dropping the height
   * there collapses a container full of absolutely positioned children to zero
   * — which yanks the page scroll position back on every infinite-scroll page.
   */
  const hasPositions = isMounted && items.length > 0 && containerHeight > 0;

  /**
   * JS Masonry rendering
   */
  return (
    <div
      ref={containerRef}
      className={`msgl-container${
        isMounted ? ' msgl-container--js' : ' msgl-container--ssr'
      }${className ? ` ${className}` : ''}`}
      style={
        {
          position: isMounted ? 'relative' : undefined,
          height: hasPositions ? `${containerHeight}px` : undefined,
          '--msgl-transition-duration': `${transitionDuration}ms`,
          '--msgl-gutter': `${gutter}px`,
          '--msgl-min-col-width': `${minColWidth}px`,
          ...style,
        } as React.CSSProperties
      }
    >
      {items.map((item, i) => {
        const pos = positions[i];
        const isPositioned = isMounted && pos !== undefined;

        // Skip items outside the viewport when virtualizing.
        if (visibleIndices !== null && !visibleIndices.has(i)) return null;

        return (
          <div
            key={keyFor(item, i)}
            ref={getRefCallback(i)}
            className={`msgl-item${
              animate && isPositioned ? ' msgl-item--animated' : ''
            }`}
            style={
              isPositioned
                ? {
                    position: 'absolute',
                    width: `${pos.width}px`,
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                  }
                : undefined
            }
          >
            {renderItem(item, i)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Thin adapter over the shared core so the component body stays readable.
 */
function computeLayout_(
  count: number,
  heights: (number | undefined)[],
  containerWidth: number,
  gutter: number,
  minColWidth: number,
  columns: ColumnsOption | undefined,
  fallbackHeight: number | undefined
) {
  return computeLayout({
    count,
    heights,
    containerWidth,
    gutter,
    minColWidth,
    columns,
    fallbackHeight,
  });
}

export default MasonrySnapGrid;
