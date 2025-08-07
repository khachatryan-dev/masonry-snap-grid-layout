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

    // Expose layout instance via ref for advanced use
    useImperativeHandle(ref, () => ({
        layout: layoutRef.current,
    }));

    // Initialize MasonrySnapGridLayout instance on mount or options change
    useEffect(() => {
        if (!containerRef.current) return;

        layoutRef.current = new MasonrySnapGridLayout(containerRef.current, {
            ...options,
            initialItems: 0, // disable internal item creation
            itemContent: null,
        });

        // Perform initial layout after creation
        layoutRef.current.calculateLayout();

        return () => {
            layoutRef.current?.destroy();
            layoutRef.current = null;
        };
    }, [options]);

    // Whenever `items` change, trigger layout recalculation
    useEffect(() => {
        if (!layoutRef.current) return;

        // Optionally, you can call a method here to notify layout about changes,
        // or just rely on React rendering wrapped items (the DOM nodes)

        // Because your React renders items inside container,
        // just call calculateLayout to reposition after React update

        layoutRef.current.calculateLayout();
    }, [items]);

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
