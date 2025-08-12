import React, {
    useEffect,
    useRef,
    forwardRef,
} from 'react';
import ReactDOM from 'react-dom/client';
import MasonrySnapGridLayout from './MasonrySnapGridLayout';
import { MasonrySnapGridLayoutOptions, MasonrySnapGridRef } from './types';

/**
 * Props for the MasonrySnapGrid React wrapper.
 *
 * @template T - Type of items in the masonry grid.
 */
interface MasonrySnapGridProps<T>
    extends Omit<MasonrySnapGridLayoutOptions<T>, 'items' | 'renderItem'> {
    /** The data items to render into the masonry grid. */
    items: T[];

    /** Renders a single data item into a React node. */
    renderItem: (item: T) => React.ReactNode;

    /** Optional container class name. */
    className?: string;

    /** Optional inline styles for the container. */
    style?: React.CSSProperties;
}

/**
 * React wrapper for MasonrySnapGridLayout that supports SSR-friendly rendering.
 *
 * **SSR Strategy:**
 * - On the server: render all items normally with React → HTML is SEO-friendly & visible without JS.
 * - On the client: after hydration, remove the static HTML and let MasonrySnapGridLayout take over.
 */
const MasonrySnapGridInner = <T,>(
    {
        items,
        renderItem,
        className,
        style,
        ...options
    }: MasonrySnapGridProps<T>,
    ref: React.ForwardedRef<MasonrySnapGridRef>
) => {
    /** Ref to the outer container where the masonry layout will be applied. */
    const containerRef = useRef<HTMLDivElement>(null);

    /** Ref to hold the underlying non-React Masonry layout instance. */
    const masonryRef = useRef<MasonrySnapGridLayout<T> | null>(null);

    /**
     * Stores references to all mounted React roots.
     * - Needed because we're rendering React components into DOM nodes created manually.
     * - Helps us unmount cleanly when the component unmounts.
     */
    const rootsRef = useRef<Map<HTMLElement, ReactDOM.Root>>(new Map());

    /**
     * Step 1: Server-side & initial client render
     * ------------------------------------------
     * We render all items directly inside the container so they are:
     * - Visible immediately without JS
     * - Search engine crawlable
     * - Accessible for screen readers
     */
    const serverRenderedItems = (
        <>
            {items.map((item, idx) => (
                <div
                    key={idx}
                    style={{ display: 'inline-block', verticalAlign: 'top' }}
                >
                    {renderItem(item)}
                </div>
            ))}
        </>
    );

    /**
     * Step 2: After hydration (client-side), replace server-rendered content
     * ----------------------------------------------------------------------
     * - Remove the SSR HTML to avoid conflicting with Masonry layout
     * - Initialize MasonrySnapGridLayout with dynamic item positioning
     * - Render each item into its own DOM node with React
     */
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Remove SSR-rendered children before Masonry takes over
        container.innerHTML = '';

        // Create and initialize the masonry layout instance
        masonryRef.current = new MasonrySnapGridLayout(container, {
            ...options,
            items,
            renderItem: (item) => {
                // Create a standalone DOM element for this item
                const div = document.createElement('div');

                // Render the React component into that DOM node
                const root = ReactDOM.createRoot(div);
                root.render(renderItem(item));

                // Store root for cleanup on unmount
                rootsRef.current.set(div, root);

                return div;
            },
        });

        return () => {
            // Unmount all React roots to prevent memory leaks
            rootsRef.current.forEach((root, div) => {
                root.unmount();
                div.remove();
            });
            rootsRef.current.clear();

            // Destroy masonry instance
            masonryRef.current?.destroy();
            masonryRef.current = null;
        };
    }, [options, renderItem]);

    /**
     * Step 3: When items change, update only the content — not full layout re-init.
     * ---------------------------------------------------------------------------
     * This avoids tearing down and rebuilding the entire grid unnecessarily.
     */
    useEffect(() => {
        if (masonryRef.current) {
            masonryRef.current.updateItems(items);
        }
    }, [items]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
        >
            {/* Render SSR-friendly static layout before hydration */}
            {serverRenderedItems}
        </div>
    );
};

/**
 * ForwardRef wrapper so parent components can access MasonrySnapGrid methods.
 */
const MasonrySnapGrid = forwardRef(MasonrySnapGridInner) as <T>(
    props: MasonrySnapGridProps<T> & { ref?: React.ForwardedRef<MasonrySnapGridRef> }
) => ReturnType<typeof MasonrySnapGridInner>;

export default MasonrySnapGrid;
