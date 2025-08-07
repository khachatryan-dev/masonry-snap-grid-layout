'use client';

import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
    ReactNode,
} from 'react';
import MasonrySnapGridLayout from './MasonrySnapGridLayout';
import { MasonrySnapGridLayoutOptions } from './types';

type MasonrySnapGridProps<T = any> = {
    items: T[];
    options?: MasonrySnapGridLayoutOptions;
    renderItem: (item: T, index: number) => ReactNode;
    className?: string;
    style?: React.CSSProperties;
};

export type MasonrySnapGridRef = {
    layout: MasonrySnapGridLayout | null;
};

const MasonrySnapGrid = forwardRef(function MasonrySnapGrid<T>(
    { items, options = {}, renderItem, className, style }: MasonrySnapGridProps<T>,
    ref: React.Ref<MasonrySnapGridRef>
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const layoutRef = useRef<MasonrySnapGridLayout | null>(null);

    // Expose layout instance if needed
    useImperativeHandle(ref, () => ({
        layout: layoutRef.current,
    }));

    // Initialize masonry layout once
    useEffect(() => {
        if (!containerRef.current) return;

        layoutRef.current = new MasonrySnapGridLayout(containerRef.current, {
            ...options,
            // We disable internal item generation because React controls content
            initialItems: 0,
            itemContent: null,
        });

        return () => {
            layoutRef.current?.destroy();
            layoutRef.current = null;
        };
    }, [options]);

    // Whenever items change, re-render React children inside container
    useEffect(() => {
        if (!containerRef.current || !layoutRef.current) return;

        // Clear container children before React renders new items
        containerRef.current.innerHTML = '';

        // Render React children directly inside container
        // Using ReactDOM.createPortal for each item

        // However, to keep it simple, we rely on React rendering here:

    }, [items, renderItem]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
            aria-label="Masonry grid"
            role="list"
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    className="masonry-snap-grid-item"
                    style={{ breakInside: 'avoid' }}
                    role="listitem"
                    aria-posinset={index + 1}
                    aria-setsize={items.length}
                >
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
});

export default MasonrySnapGrid;
