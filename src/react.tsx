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
    const containerRef = useRef<HTMLDivElement>(null);
    const masonryRef = useRef<MasonrySnapGridLayout<T> | null>(null);
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
            // Proper cleanup
            rootsRef.current.forEach((root, div) => {
                root.unmount();
                div.remove();
            });
            rootsRef.current.clear();
            masonryRef.current?.destroy();
            masonryRef.current = null;
        };
    }, [options, renderItem]);

    // Update items on change
    useEffect(() => {
        if (masonryRef.current) {
            masonryRef.current.updateItems(items);
        }
    }, [items]);

    // Properly typed imperative handle
    useImperativeHandle(ref, () => ({
        get layout() {
            return masonryRef.current;
        }
    }), []);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
        />
    );
};

// Properly typed forwardRef component
const MasonrySnapGrid = forwardRef(MasonrySnapGridInner) as <T>(
    props: MasonrySnapGridProps<T> & { ref?: React.ForwardedRef<MasonrySnapGridRef> }
) => ReturnType<typeof MasonrySnapGridInner>;

export default MasonrySnapGrid;