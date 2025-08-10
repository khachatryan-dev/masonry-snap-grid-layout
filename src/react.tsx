import React, {
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
} from 'react';
import ReactDOM from 'react-dom/client';
import MasonrySnapGridLayout from './MasonrySnapGridLayout';
import {
    MasonrySnapGridLayoutOptions,
    MasonrySnapGridRef,
} from './types';

/**
 * Props for the MasonrySnapGrid React component.
 *
 * @template T - The type of items in the masonry layout.
 */
interface MasonrySnapGridProps<T>
    extends Omit<MasonrySnapGridLayoutOptions<T>, 'items' | 'renderItem'> {
    /** Array of data items to be rendered into the masonry grid. */
    items: T[];

    /** Function that renders a single data item as a React node. */
    renderItem: (item: T) => React.ReactNode;

    /** Optional class name for the container. */
    className?: string;

    /** Optional inline styles for the container. */
    style?: React.CSSProperties;
}

/**
 * Internal component that bridges MasonrySnapGridLayout with React.
 *
 * - Manages lifecycle of the underlying MasonrySnapGridLayout instance.
 * - Uses ReactDOM.createRoot to render React nodes into non-React DOM elements.
 * - Handles cleanup to avoid memory leaks.
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
    /** Ref to the container DOM element where MasonrySnapGridLayout will operate. */
    const containerRef = useRef<HTMLDivElement>(null);

    /** Ref to the MasonrySnapGridLayout instance (non-React logic). */
    const masonryRef = useRef<MasonrySnapGridLayout<T> | null>(null);

    /** Tracks all mounted React roots for cleanup. */
    const rootsRef = useRef<Map<HTMLElement, ReactDOM.Root>>(new Map());

    // Initialize masonry layout when container mounts
    useEffect(() => {
        if (!containerRef.current) return;

        masonryRef.current = new MasonrySnapGridLayout(containerRef.current, {
            ...options,
            items,
            renderItem: (item) => {
                // Create a standalone DOM element for each item
                const div = document.createElement('div');

                // Render React content into this element
                const root = ReactDOM.createRoot(div);
                root.render(renderItem(item));

                // Keep track of the React root for later cleanup
                rootsRef.current.set(div, root);

                return div;
            },
        });

        return () => {
            // Clean up all React roots and remove their DOM nodes
            rootsRef.current.forEach((root, div) => {
                root.unmount();
                div.remove();
            });
            rootsRef.current.clear();

            // Destroy the Masonry instance
            masonryRef.current?.destroy();
            masonryRef.current = null;
        };
    }, [options, renderItem]);

    // Update only the items when the data changes (avoid full re-initialization)
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
        />
    );
};

/**
 * MasonrySnapGrid
 *
 * React wrapper component for MasonrySnapGridLayout.
 *
 * @template T - The type of items in the masonry layout.
 */
const MasonrySnapGrid = forwardRef(MasonrySnapGridInner) as <T>(
    props: MasonrySnapGridProps<T> & { ref?: React.ForwardedRef<MasonrySnapGridRef> }
) => ReturnType<typeof MasonrySnapGridInner>;

export default MasonrySnapGrid;
