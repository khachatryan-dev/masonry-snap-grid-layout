import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
    ReactNode,
    useMemo
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
    const itemsRef = useRef<HTMLElement[]>([]);

    // Create item elements
    const itemElements = useMemo(() => {
        return items.map((item, index) => (
            <div
                key={index}
                ref={el => {
                    if (el) itemsRef.current[index] = el;
                }}
                className="masonry-snap-grid-item"
                style={{ position: 'absolute' }}
            >
                {renderItem(item, index)}
            </div>
        ));
    }, [items, renderItem]);

    // Expose layout instance
    useImperativeHandle(ref, () => ({
        layout: layoutRef.current,
    }));

    // Initialize layout
    useEffect(() => {
        if (!containerRef.current) return;

        layoutRef.current = new MasonrySnapGridLayout(
            containerRef.current,
            options
        );

        return () => {
            layoutRef.current?.destroy();
        };
    }, [options]);

    // Update items
    useEffect(() => {
        if (!layoutRef.current) return;

        // Filter out null refs
        const validItems = itemsRef.current.filter(Boolean) as HTMLElement[];
        layoutRef.current.setItems(validItems);

    }, [itemElements]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
        >
            {itemElements}
        </div>
    );
});

export default MasonrySnapGrid;