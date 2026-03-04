import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { LayoutMode } from '../core/types';
import { getColumnCount, supportsCss } from '../core/utils';

export interface MasonrySnapGridProps<T> {
  /** Array of data items to render */
  items: T[];
  /** Engine strategy. Default: 'auto' */
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
}

interface ItemPosition {
  x: number;
  y: number;
  width: number;
}

/**
 * SSR-friendly React masonry grid component.
 *
 * - Server renders items as a responsive CSS grid (SEO-friendly, fast FCP).
 * - Client hydrates and applies masonry positioning via JS transforms.
 * - Automatically re-layouts on container resize via ResizeObserver.
 *
 * @example
 * <MasonrySnapGrid
 *   items={items}
 *   gutter={16}
 *   minColWidth={240}
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
}: MasonrySnapGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // isMounted is false on server and during initial hydration to avoid mismatch
  const [isMounted, setIsMounted] = useState(false);
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [useCss, setUseCss] = useState(false);

  // Determine engine once on mount (client-only)
  useEffect(() => {
    setIsMounted(true);
    if (layoutMode === 'css') {
      setUseCss(true);
    } else if (layoutMode === 'auto') {
      setUseCss(supportsCss('grid-template-rows', 'masonry'));
    }
  }, [layoutMode]);

  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) return;

    const cols = getColumnCount(containerWidth, minColWidth, gutter);
    const colWidth = (containerWidth - gutter * (cols - 1)) / cols;
    const colHeights = new Array<number>(cols).fill(0);

    // itemRefs may be stale for removed items; slice to current length
    const currentRefs = itemRefs.current.slice(0, items.length);

    const newPositions: ItemPosition[] = currentRefs.map((el) => {
      const minH = Math.min(...colHeights);
      const col = colHeights.indexOf(minH);
      const pos: ItemPosition = { x: col * (colWidth + gutter), y: colHeights[col], width: colWidth };
      const itemHeight = el ? el.offsetHeight : 0;
      colHeights[col] += itemHeight + gutter;
      return pos;
    });

    const maxColHeight = items.length > 0 ? Math.max(...colHeights) - gutter : 0;

    setPositions(newPositions);
    setContainerHeight(Math.max(0, maxColHeight));
  }, [items, gutter, minColWidth]);

  // Compute layout after mount and whenever items or layout options change
  useEffect(() => {
    if (!isMounted || useCss) return;
    computeLayout();
  }, [isMounted, useCss, computeLayout]);

  // Respond to container resize
  useEffect(() => {
    if (!isMounted || useCss) return;
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(computeLayout);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isMounted, useCss, computeLayout]);

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
