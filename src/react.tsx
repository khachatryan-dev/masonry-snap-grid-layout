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

interface MasonrySnapGridProps<T>
    extends Omit<MasonrySnapGridLayoutOptions<T>, 'items' | 'renderItem'> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

function MasonrySnapGridInner<T>(
    {
        items,
        renderItem,
        className,
        style,
        ...options
    }: MasonrySnapGridProps<T>,
    ref: React.Ref<MasonrySnapGridRef>
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const masonryRef = useRef<MasonrySnapGridLayout<T> | null>(null);

    // React roots storage to prevent memory leaks
    const rootsRef = useRef<Map<HTMLElement, ReactDOM.Root>>(new Map());

    // Initialize masonry layout
    useEffect(() => {
        if (!containerRef.current) return;

        masonryRef.current = new MasonrySnapGridLayout(containerRef.current, {
            ...options,
            items,
            renderItem: (item) => {
                const div = document.createElement('div');
                const root = ReactDOM.createRoot(div);
                root.render(renderItem(item));
                rootsRef.current.set(div, root);
                return div;
            },
        });

        return () => {
            // Unmount all React roots to avoid memory leaks
            rootsRef.current.forEach((root) => root.unmount());
            rootsRef.current.clear();

            masonryRef.current?.destroy();
            masonryRef.current = null;
        };
    }, [options, renderItem]); // include renderItem if it's not memoized

    // Update items on change
    useEffect(() => {
        if (masonryRef.current) {
            masonryRef.current.updateItems(items);
        }
    }, [items]);

    // Expose layout instance through ref
    useImperativeHandle(ref, () => ({
        layout: masonryRef.current!,
    }));

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
        />
    );
}

// Apply generic type correctly to forwardRef
const MasonrySnapGrid = forwardRef(MasonrySnapGridInner) as <T>(
    props: MasonrySnapGridProps<T> & { ref?: React.Ref<MasonrySnapGridRef> }
) => ReturnType<typeof MasonrySnapGridInner>;

export default MasonrySnapGridInner
