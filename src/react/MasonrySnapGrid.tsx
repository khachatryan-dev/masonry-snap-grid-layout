import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutMode } from '../core/types';
import { getColumnCount, supportsCss } from '../core/utils';

export interface MasonrySnapGridProps<T> {
  /** Array of data items to render */
  items: T[];
  /**
   * Engine strategy.
   * - `'auto'` (default) — uses native CSS masonry if the browser supports it; falls back to JS.
   * - `'js'` — always uses JS masonry.
   */
  layoutMode?: LayoutMode;
  /** Space between items in pixels. Default: 16 */
  gutter?: number;
  /** Minimum column width in pixels. Default: 250 */
  minColWidth?: number;
  /** Enable smooth CSS transition animations. Default: true */
  animate?: boolean;
  /** Transition duration in ms (JS mode only). Default: 400 */
  transitionDuration?: number;
  /** Render function — receives an item and returns JSX */
  renderItem: (item: T) => React.ReactNode;
  /** Optional className for the container */
  className?: string;
  /** Optional inline styles for the container */
  style?: React.CSSProperties;
  /**
   * Enable scroll-based virtualization for large datasets (JS masonry mode only).
   * After the initial measurement pass, only items visible within the viewport
   * plus the `overscan` buffer are kept in the DOM. Default: false
   */
  virtualize?: boolean;
  /**
   * Pixel buffer above and below the viewport rendered during virtualization.
   * Larger values reduce pop-in on fast scrolling. Default: 300
   */
  overscan?: number;
}

interface ItemPosition {
  x: number;
  y: number;
  width: number;
}

/**
 * SSR-friendly React masonry grid component.
 *
 * - Server renders all items as a responsive CSS grid (SEO-friendly, visible in page source).
 * - Client detects native CSS masonry support and uses it when available.
 * - Falls back to JS absolute-positioning masonry with optional scroll virtualization.
 * - Automatically re-layouts on container resize via ResizeObserver.
 *
 * @example
 * <MasonrySnapGrid
 *   items={items}
 *   gutter={16}
 *   minColWidth={240}
 *   virtualize
 *   renderItem={(item) => <div style={{ height: item.height }}>{item.title}</div>}
 * />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** Cached measured offsetHeight for each item by index. */
  const cachedHeightsRef = useRef<number[]>([]);
  /** Container's absolute top offset from the document top (updated on mount/resize). */
  const containerAbsTopRef = useRef(0);
  /**
   * Ref mirror of `isMeasured` — read inside callbacks without adding to deps.
   * Avoids recreating computeLayout / ResizeObserver on every measurement cycle.
   */
  const isMeasuredRef = useRef(false);

  // isMounted is false on server / initial hydration to avoid mismatch
  const [isMounted, setIsMounted] = useState(false);
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [useCss, setUseCss] = useState(false);
  // Triggers a re-render when the initial measurement pass completes
  const [isMeasured, setIsMeasured] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  // Determine engine once on mount (client-only)
  // 'auto': use CSS masonry if browser supports it, else JS
  // 'js': always use JS masonry
  useEffect(() => {
    setIsMounted(true);
    if (layoutMode !== 'js') {
      setUseCss(supportsCss('grid-template-rows', 'masonry'));
    }
  }, [layoutMode]);

  // When items change, reset measurement state so all items are rendered again
  // for re-measurement (handles added/removed items correctly).
  useEffect(() => {
    if (!virtualize) return;
    isMeasuredRef.current = false;
    setIsMeasured(false);
    // Trim the cache to current length; keep heights for unchanged items
    cachedHeightsRef.current = cachedHeightsRef.current.slice(0, items.length);
  }, [items, virtualize]);

  /**
   * Stable ref to the latest computeLayout.
   * Lets ResizeObserver and the measurement-reset effect always call the
   * current version without putting `computeLayout` in their dep arrays —
   * which would otherwise reconnect the observer / re-run those effects on
   * every items change, triggering an immediate ResizeObserver fire and an
   * extra layout cycle.
   */
  const computeLayoutRef = useRef<() => void>(() => {});

  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) return;

    const cols = getColumnCount(containerWidth, minColWidth, gutter);
    const colWidth = (containerWidth - gutter * (cols - 1)) / cols;
    const colHeights = new Array<number>(cols).fill(0);

    // Measure currently-rendered items and update the height cache.
    // Off-screen virtualized items have null refs — their cached heights are reused.
    itemRefs.current.slice(0, items.length).forEach((el, i) => {
      if (el) {
        const h = el.offsetHeight;
        if (h > 0) cachedHeightsRef.current[i] = h;
      }
    });

    // Compute positions for ALL items using cached heights so the container
    // height and scroll are always correct even when items are virtualized away.
    const newPositions: ItemPosition[] = items.map((_, i) => {
      const minH = Math.min(...colHeights);
      const col = colHeights.indexOf(minH);
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

    // Once every item has a cached height, enable virtualization.
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

  // Keep the ref in sync with the latest computeLayout after every render.
  useEffect(() => {
    computeLayoutRef.current = computeLayout;
  });

  // Primary layout effect — runs after mount and whenever items / gutter / minColWidth change.
  useEffect(() => {
    if (!isMounted || useCss) return;
    computeLayout();
  }, [isMounted, useCss, computeLayout]);

  // Secondary layout effect — fires only when isMeasured resets to false.
  // Does NOT depend on computeLayout so it never fires just because items changed —
  // that would duplicate the work already done by the primary effect above.
  useEffect(() => {
    if (!isMounted || useCss || isMeasured) return;
    computeLayoutRef.current();
  }, [isMounted, useCss, isMeasured]); // ← no computeLayout dep

  // Respond to container resize. Clear height cache because column widths
  // change, which means item heights may change too.
  // Does NOT depend on computeLayout so the observer is never reconnected
  // on items changes. Reconnecting a live observer immediately fires its callback,
  // which would reset isMeasured and trigger an extra unwanted layout cycle.
  useEffect(() => {
    if (!isMounted || useCss) return;
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      cachedHeightsRef.current = [];
      isMeasuredRef.current = false;
      setIsMeasured(false);
      computeLayoutRef.current(); // always latest, no dep needed
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isMounted, useCss]); // ← no computeLayout dep — observer is stable

  // Track window scroll and viewport size for virtualization
  useEffect(() => {
    if (!virtualize || !isMounted || useCss) return;

    const syncContainerTop = () => {
      if (containerRef.current) {
        containerAbsTopRef.current =
          containerRef.current.getBoundingClientRect().top + window.scrollY;
      }
    };
    const onScroll = () => setScrollY(window.scrollY);
    const onResize = () => {
      setViewportH(window.innerHeight);
      syncContainerTop();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Initialise synchronously so the first render has correct values
    setViewportH(window.innerHeight);
    syncContainerTop();
    setScrollY(window.scrollY);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [virtualize, isMounted, useCss]);

  /**
   * Set of item indices that should be rendered.
   * `null` means "render everything" (virtualization inactive or not yet measured).
   */
  const visibleIndices = useMemo<Set<number> | null>(() => {
    if (!virtualize || !isMeasured || positions.length === 0) return null;

    // Item positions are relative to the container top.
    // Translate scroll position into container-relative coordinates.
    const relStart = scrollY - containerAbsTopRef.current - overscan;
    const relEnd = scrollY - containerAbsTopRef.current + viewportH + overscan;

    const visible = new Set<number>();
    positions.forEach((pos, i) => {
      const itemH = cachedHeightsRef.current[i] ?? 0;
      if (pos.y + itemH >= relStart && pos.y <= relEnd) {
        visible.add(i);
      }
    });
    return visible;
  }, [virtualize, isMeasured, positions, scrollY, viewportH, overscan]);

  // ─── CSS masonry mode ────────────────────────────────────────────────────
  if (isMounted && useCss) {
    return (
      <div
        ref={containerRef}
        className={`msgl-container msgl-container--css${className ? ` ${className}` : ''}`}
        style={
          {
            '--msgl-gutter': `${gutter}px`,
            '--msgl-min-col-width': `${minColWidth}px`,
            ...style,
          } as React.CSSProperties
        }
      >
        {items.map((item, i) => (
          <div key={i} className="msgl-item">
            {renderItem(item)}
          </div>
        ))}
      </div>
    );
  }

  // ─── JS masonry mode (+ SSR initial render) ──────────────────────────────
  // SSR note: the server renders all items with the `--ssr` class (a plain CSS
  // grid), so they are visible in the page source and indexable by crawlers.
  // The client switches to `--js` after hydration and applies masonry positions.
  const hasPositions = isMounted && positions.length === items.length && items.length > 0;

  return (
    <div
      ref={containerRef}
      className={`msgl-container${isMounted ? ' msgl-container--js' : ' msgl-container--ssr'}${className ? ` ${className}` : ''}`}
      style={
        {
          position: isMounted ? 'relative' : undefined,
          height: hasPositions ? `${containerHeight}px` : undefined,
          '--msgl-transition-duration': `${transitionDuration}ms`,
          ...style,
        } as React.CSSProperties
      }
    >
      {items.map((item, i) => {
        const pos = positions[i];
        const isPositioned = isMounted && pos !== undefined;

        // After the initial measurement pass, skip items outside the viewport.
        // `visibleIndices === null` means virtualization is inactive → render all.
        if (visibleIndices !== null && !visibleIndices.has(i)) return null;

        return (
          <div
            key={i}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`msgl-item${animate && isPositioned ? ' msgl-item--animated' : ''}`}
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
