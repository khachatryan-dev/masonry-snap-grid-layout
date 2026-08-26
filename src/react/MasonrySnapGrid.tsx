import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canVirtualize,
  computeLayout,
  computeVisibleIndices,
  createItemObserver,
  createScheduler,
  createScrollTracker,
  EMPTY_SCROLL_STATE,
  resolveColumnCount,
  resolveScrollTarget,
  supportsCss,
  type ColumnsOption,
  type ItemObserver,
  type ItemPosition,
  type LayoutInfo,
  type LayoutMode,
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

  /** Cache of measured item heights, indexed by item position. */
  const cachedHeightsRef = useRef<number[]>([]);

  /** Whether every item has been measured at least once. */
  const isMeasuredRef = useRef(false);

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

  /** Set once every item has a real measured height. */
  const [isMeasured, setIsMeasured] = useState(false);

  /** Latest scroll geometry, updated at most once per frame. */
  const [scroll, setScroll] = useState<ScrollState>(EMPTY_SCROLL_STATE);

  /** Container width, tracked only when CSS mode needs it for breakpoints. */
  const [cssWidth, setCssWidth] = useState(0);

  const hasEstimate =
    typeof estimatedItemHeight === 'number' && estimatedItemHeight > 0;

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
    cachedHeightsRef.current.length = items.length;
  }, [items]);

  /**
   * Reset measurement when items change so new items get measured.
   */
  useEffect(() => {
    if (!virtualize) return;
    isMeasuredRef.current = false;
    setIsMeasured(false);
  }, [items, virtualize]);

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

    // Measure whatever is currently mounted; virtualized-away items keep
    // their previously cached height.
    itemRefs.current.slice(0, items.length).forEach((el, i) => {
      if (!el) return;
      const h = el.offsetHeight;
      if (h > 0) cachedHeightsRef.current[i] = h;
    });

    const result = computeLayout_(
      items.length,
      cachedHeightsRef.current,
      containerWidth,
      gutter,
      minColWidth,
      columns,
      hasEstimate ? estimatedItemHeight : 0
    );

    setPositions(result.positions);
    setContainerHeight(result.containerHeight);

    if (virtualize && !isMeasuredRef.current) {
      const allCached = items.every(
        (_, i) => (cachedHeightsRef.current[i] ?? 0) > 0
      );
      if (allCached) {
        isMeasuredRef.current = true;
        setIsMeasured(true);
      }
    }

    onLayoutRef.current?.({
      columnCount: result.columnCount,
      columnWidth: result.columnWidth,
      containerHeight: result.containerHeight,
      itemCount: items.length,
      engine: 'js',
    });
  }, [
    items,
    gutter,
    minColWidth,
    columns,
    virtualize,
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
   * Re-run layout once measurement state flips, so newly measured items are
   * positioned with their real heights.
   */
  useEffect(() => {
    if (!isMounted || useCss) return;
    computeLayoutRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMeasured]);

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
      cachedHeightsRef.current = [];
      isMeasuredRef.current = false;
      setIsMeasured(false);
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
    const active = canVirtualize({
      virtualize,
      isMeasured,
      hasEstimate,
      itemCount: items.length,
    });

    if (!active || positions.length !== items.length) return null;

    return computeVisibleIndices({
      positions,
      heights: cachedHeightsRef.current,
      scroll,
      overscan,
      fallbackHeight: hasEstimate ? estimatedItemHeight : 0,
    });
  }, [
    virtualize,
    isMeasured,
    hasEstimate,
    estimatedItemHeight,
    items.length,
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

  const keyFor = useCallback(
    (item: T, i: number): React.Key => (getItemKey ? getItemKey(item, i) : i),
    [getItemKey]
  );

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

  const hasPositions =
    isMounted && positions.length === items.length && items.length > 0;

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
  heights: number[],
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
