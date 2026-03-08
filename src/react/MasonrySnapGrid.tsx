import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutMode } from '../core/types';
import { getColumnCount, supportsCss } from '../core/utils';

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

  /** Enable transform transition animations */
  animate?: boolean;

  /** Transition duration in milliseconds */
  transitionDuration?: number;

  /** Item renderer */
  renderItem: (item: T) => React.ReactNode;

  /** Optional container class */
  className?: string;

  /** Optional container styles */
  style?: React.CSSProperties;

  /** Enable scroll virtualization */
  virtualize?: boolean;

  /** Extra viewport buffer when virtualizing */
  overscan?: number;
}

/**
 * Internal layout position for each item
 */
interface ItemPosition {
  x: number;
  y: number;
  width: number;
}

/**
 * MasonrySnapGrid
 *
 * SSR friendly masonry grid that:
 * - renders SEO friendly markup on server
 * - upgrades to CSS masonry when supported
 * - falls back to JS masonry positioning
 * - supports optional virtualization
 *
 * The component uses cached heights and absolute positioning
 * to calculate column flow similar to Pinterest layouts.
 */
function MasonrySnapGrid<T>({
                              items,
                              layoutMode = 'auto',
                              gutter = 16,
                              minColWidth = 250,
                              animate = true,
                              transitionDuration = 400,
                              renderItem,
                              className,
                              style,
                              virtualize = false,
                              overscan = 300,
                            }: MasonrySnapGridProps<T>) {

  /**
   * Container DOM reference
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Refs to individual item elements
   * Used to measure heights after render
   */
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Cache of measured item heights
   * Prevents unnecessary re-measurement
   */
  const cachedHeightsRef = useRef<number[]>([]);

  /**
   * Absolute container offset from document top
   * Used for virtualization calculations
   */
  const containerAbsTopRef = useRef(0);

  /**
   * Tracks whether all items have been measured
   * Required before enabling virtualization
   */
  const isMeasuredRef = useRef(false);

  /**
   * Stores previous container width to avoid
   * unnecessary layout recalculations on height changes
   */
  const prevWidthRef = useRef(0);

  /**
   * Stable reference to layout computation function
   * Allows effects to call the latest version safely
   */
  const computeLayoutRef = useRef<() => void>(() => {});

  /**
   * Client mount detection (avoids SSR mismatch)
   */
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Calculated positions for each item
   */
  const [positions, setPositions] = useState<ItemPosition[]>([]);

  /**
   * Total container height (used when JS positioning active)
   */
  const [containerHeight, setContainerHeight] = useState(0);

  /**
   * Whether native CSS masonry should be used
   */
  const [useCss, setUseCss] = useState(false);

  /**
   * Virtualization activation state
   */
  const [isMeasured, setIsMeasured] = useState(false);

  /**
   * Current scroll position
   */
  const [scrollY, setScrollY] = useState(0);

  /**
   * Viewport height
   */
  const [viewportH, setViewportH] = useState(0);

  /**
   * Detect client mount and CSS masonry support
   */
  useEffect(() => {
    setIsMounted(true);

    if (layoutMode !== 'js') {
      setUseCss(supportsCss('grid-template-rows', 'masonry'));
    }
  }, [layoutMode]);

  /**
   * Ensure itemRefs array length always matches items
   */
  useEffect(() => {
    itemRefs.current.length = items.length;
  }, [items]);

  /**
   * Reset measurement when items change
   */
  useEffect(() => {
    if (!virtualize) return;

    isMeasuredRef.current = false;
    setIsMeasured(false);

    cachedHeightsRef.current =
        cachedHeightsRef.current.slice(0, items.length);
  }, [items, virtualize]);

  /**
   * Core masonry layout algorithm
   *
   * Steps:
   * 1. Measure item heights
   * 2. Determine column count
   * 3. Place each item in the shortest column
   * 4. Calculate container height
   */
  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) return;

    const cols = getColumnCount(containerWidth, minColWidth, gutter);
    const colWidth = (containerWidth - gutter * (cols - 1)) / cols;

    const colHeights = new Array<number>(cols).fill(0);

    /**
     * Measure visible item heights
     */
    itemRefs.current.slice(0, items.length).forEach((el, i) => {
      if (!el) return;

      const h = el.offsetHeight;
      if (h > 0) cachedHeightsRef.current[i] = h;
    });

    /**
     * Calculate masonry positions
     */
    const newPositions: ItemPosition[] = items.map((_, i) => {

      let minH = colHeights[0];
      let col = 0;

      // find shortest column
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < minH) {
          minH = colHeights[c];
          col = c;
        }
      }

      const pos: ItemPosition = {
        x: col * (colWidth + gutter),
        y: colHeights[col],
        width: colWidth,
      };

      colHeights[col] += (cachedHeightsRef.current[i] ?? 0) + gutter;

      return pos;
    });

    const maxColHeight =
        items.length > 0 ? Math.max(...colHeights) - gutter : 0;

    setPositions(newPositions);
    setContainerHeight(Math.max(0, maxColHeight));

    /**
     * Activate virtualization once all items measured
     */
    if (virtualize && !isMeasuredRef.current) {
      const allCached = items.every(
          (_, i) => (cachedHeightsRef.current[i] ?? 0) > 0
      );

      if (allCached) {
        isMeasuredRef.current = true;
        setIsMeasured(true);
      }
    }

  }, [items, gutter, minColWidth, virtualize]);

  /**
   * Keep computeLayout ref updated
   */
  useLayoutEffect(() => {
    computeLayoutRef.current = computeLayout;
  }, [computeLayout]);

  /**
   * Initial layout calculation
   */
  useEffect(() => {
    if (!isMounted || useCss) return;
    computeLayoutRef.current();
  }, [isMounted, useCss, items, gutter, minColWidth]);

  /**
   * Recalculate layout after measurement completes
   */
  useEffect(() => {
    if (!isMounted || useCss) return;
    computeLayoutRef.current();
  }, [isMeasured]);

  /**
   * ResizeObserver
   *
   * Only reacts to WIDTH changes to prevent layout loops.
   */
  useEffect(() => {
    if (!isMounted || useCss) return;

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {

      const width = entries[0].contentRect.width;

      if (prevWidthRef.current === width) return;

      prevWidthRef.current = width;

      cachedHeightsRef.current = [];
      isMeasuredRef.current = false;

      setIsMeasured(false);

      computeLayoutRef.current();
    });

    observer.observe(container);

    return () => observer.disconnect();

  }, [isMounted, useCss]);

  /**
   * Scroll + viewport tracking
   *
   * Used for virtualization calculations.
   */
  useEffect(() => {
    if (!virtualize || !isMounted || useCss) return;

    const syncContainerTop = () => {
      if (containerRef.current) {
        containerAbsTopRef.current =
            containerRef.current.getBoundingClientRect().top +
            window.scrollY;
      }
    };

    const onScroll = () => {
      setScrollY(window.scrollY);
      syncContainerTop();
    };

    const onResize = () => {
      setViewportH(window.innerHeight);
      syncContainerTop();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    setViewportH(window.innerHeight);
    syncContainerTop();
    setScrollY(window.scrollY);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };

  }, [virtualize, isMounted, useCss]);

  /**
   * Determine which items are visible when virtualization is enabled
   */
  const visibleIndices = useMemo<Set<number> | null>(() => {

    if (!virtualize || !isMeasured || positions.length === 0) {
      return null;
    }

    const relStart =
        scrollY - containerAbsTopRef.current - overscan;

    const relEnd =
        scrollY -
        containerAbsTopRef.current +
        viewportH +
        overscan;

    const visible = new Set<number>();

    positions.forEach((pos, i) => {

      const itemH = cachedHeightsRef.current[i] ?? 0;

      if (pos.y + itemH >= relStart && pos.y <= relEnd) {
        visible.add(i);
      }

    });

    return visible;

  }, [virtualize, isMeasured, positions, scrollY, viewportH, overscan]);

  /**
   * CSS Masonry mode
   *
   * If supported, this avoids JS layout entirely.
   */
  if (isMounted && useCss) {
    return (
        <div
            ref={containerRef}
            className={`msgl-container msgl-container--css${
                className ? ` ${className}` : ''
            }`}
            style={{
              '--msgl-gutter': `${gutter}px`,
              '--msgl-min-col-width': `${minColWidth}px`,
              ...style,
            } as React.CSSProperties}
        >
          {items.map((item, i) => (
              <div key={i} className="msgl-item">
                {renderItem(item)}
              </div>
          ))}
        </div>
    );
  }

  /**
   * Determine if positions are ready
   */
  const hasPositions =
      isMounted &&
      positions.length === items.length &&
      items.length > 0;

  /**
   * JS Masonry rendering
   */
  return (
      <div
          ref={containerRef}
          className={`msgl-container${
              isMounted
                  ? ' msgl-container--js'
                  : ' msgl-container--ssr'
          }${className ? ` ${className}` : ''}`}
          style={{
            position: isMounted ? 'relative' : undefined,
            height: hasPositions
                ? `${containerHeight}px`
                : undefined,
            '--msgl-transition-duration': `${transitionDuration}ms`,
            ...style,
          } as React.CSSProperties}
      >

        {items.map((item, i) => {

          const pos = positions[i];
          const isPositioned =
              isMounted && pos !== undefined;

          /**
           * Skip items outside viewport when virtualizing
           */
          if (
              visibleIndices !== null &&
              positions.length === items.length &&
              !visibleIndices.has(i)
          ) {
            return null;
          }

          return (
              <div
                  key={i}
                  ref={(el) => {
                    if (itemRefs.current[i] !== el) {
                      itemRefs.current[i] = el;
                    }
                  }}
                  className={`msgl-item${
                      animate && isPositioned
                          ? ' msgl-item--animated'
                          : ''
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
                {renderItem(item)}
              </div>
          );

        })}
      </div>
  );
}

export default MasonrySnapGrid;