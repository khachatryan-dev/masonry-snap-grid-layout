import React, {
    useEffect,
    useRef,
    forwardRef,
    useCallback,
} from 'react';
import ReactDOM from 'react-dom/client';
import MasonrySnapGridLayout from './MasonrySnapGridLayout';
import { MasonrySnapGridLayoutOptions, MasonrySnapGridRef } from './types';

/**
 * Props for the MasonrySnapGrid React wrapper.
 * Generic <T> allows layout to work with any item type.
 */
interface MasonrySnapGridProps<T>
    extends Omit<MasonrySnapGridLayoutOptions<T>, 'items' | 'renderItem'> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Utility — Waits until all <img> elements inside a given container
 * have either loaded or errored, or until the timeout expires.
 * This ensures layout measurements are based on final image sizes.
 */
function waitForImages(el: HTMLElement, timeout = 1000): Promise<void> {
    return new Promise((resolve) => {
        if (!el) return resolve();

        const images = Array.from(el.querySelectorAll('img'));
        if (images.length === 0) return resolve();

        let remaining = images.length;
        let called = false;

        const finish = () => {
            if (called) return;
            called = true;
            resolve();
        };

        const onLoadOrError = () => {
            remaining -= 1;
            if (remaining <= 0) finish();
        };

        images.forEach((img) => {
            if (img.complete) {
                onLoadOrError();
            } else {
                img.addEventListener('load', onLoadOrError, { once: true });
                img.addEventListener('error', onLoadOrError, { once: true });
            }
        });

        setTimeout(finish, timeout);
    });
}

/**
 * React wrapper for MasonrySnapGridLayout
 * ---------------------------------------
 * Handles SSR → CSR transition, forwards ref to parent,
 * and manages async layout initialization after image load.
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
    // DOM container where the masonry will live
    const containerRef = useRef<HTMLDivElement>(null);

    // Underlying vanilla masonry instance
    const masonryRef = useRef<MasonrySnapGridLayout<T> | null>(null);

    // Track all React roots rendered inside masonry slots (for cleanup)
    const rootsRef = useRef<Map<HTMLElement, ReactDOM.Root>>(new Map());

    // Tracks component mount state to prevent async leaks
    const isMountedRef = useRef(true);

    // Latest ref passed from parent (keeps forwardRef stable across renders)
    const latestRef = useRef(ref);
    latestRef.current = ref;

    /**
     * Forward ref handling — ensures both function refs
     * and object refs from the parent receive the correct instance.
     */
    const updateForwardedRef = useCallback((instance: MasonrySnapGridRef | null) => {
        if (latestRef.current) {
            if (typeof latestRef.current === 'function') {
                latestRef.current(instance);
            } else {
                latestRef.current.current = instance;
            }
        }
    }, []);

    /**
     * Server-rendered placeholder items.
     * Rendered inline so that:
     * - SEO crawlers see real content
     * - No layout shift before hydration
     * - Screen readers have immediate access
     */
    const serverRenderedItems = (
        <>
            {items.map((item, idx) => (
                <div key={idx} style={{ display: 'inline-block', verticalAlign: 'top' }}>
                    {renderItem(item)}
                </div>
            ))}
        </>
    );

    /**
     * Effect: Client takeover after hydration
     * ----------------------------------------
     * Steps:
     * 1. Clear server-rendered HTML
     * 2. Create and initialize masonry layout
     * 3. Wait for next paint + images load before first layout pass
     */
    useEffect(() => {
        isMountedRef.current = true;
        const container = containerRef.current;
        if (!container) return;

        // Save original SSR content in case init fails
        const serverContent = container.cloneNode(true) as HTMLElement;
        container.innerHTML = '';

        try {
            // Create Masonry instance with React-powered renderItem
            masonryRef.current = new MasonrySnapGridLayout(container, {
                ...options,
                items,
                renderItem: (item) => {
                    const div = document.createElement('div');
                    div.style.willChange = 'transform, height'; // Hint for smoother animations
                    const root = ReactDOM.createRoot(div);
                    root.render(renderItem(item));
                    rootsRef.current.set(div, root);
                    return div;
                },
            });

            // Expose instance to parent via forwarded ref
            updateForwardedRef({ layout: masonryRef.current });

        } catch (error) {
            console.error('Masonry initialization failed:', error);
            container.replaceWith(serverContent); // Fallback to SSR markup
            return;
        }

        let rafId: number | null = null;
        let cancelled = false;

        const doInitialLayout = async () => {
            try {
                // Ensure browser has painted initial DOM
                await new Promise<void>((r) => {
                    rafId = requestAnimationFrame(() => r());
                });

                if (cancelled || !isMountedRef.current) return;

                // Wait for images so item heights are final
                await waitForImages(container, 1000);

                if (cancelled || !isMountedRef.current) return;

                // Trigger initial layout pass
                masonryRef.current?.updateItems(items);
            } catch (error) {
                console.error('Initial layout failed:', error);
            }
        };

        doInitialLayout();

        return () => {
            // Cleanup on unmount
            isMountedRef.current = false;
            cancelled = true;

            if (rafId) cancelAnimationFrame(rafId);

            // Unmount React roots inside masonry slots
            rootsRef.current.forEach((root, el) => {
                try {
                    root.unmount();
                    el.remove();
                } catch (error) {
                    console.warn('Error during unmount:', error);
                }
            });
            rootsRef.current.clear();

            // Destroy masonry instance
            try {
                masonryRef.current?.destroy();
            } catch (error) {
                console.warn('Error during masonry cleanup:', error);
            }
            masonryRef.current = null;

            // Reset forwarded ref
            updateForwardedRef(null);
        };
    }, [options, renderItem, updateForwardedRef]);

    /**
     * Effect: Handle updates when `items` changes
     * --------------------------------------------
     * Avoids full re-init by just telling masonry to refresh layout.
     * Uses rAF to batch updates for better performance.
     */
    useEffect(() => {
        if (!masonryRef.current) return;

        const rafId = requestAnimationFrame(() => {
            try {
                masonryRef.current?.updateItems(items);
            } catch (error) {
                console.error('Items update failed:', error);
            }
        });

        return () => cancelAnimationFrame(rafId);
    }, [items]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
        >
            {serverRenderedItems}
        </div>
    );
};

/**
 * ForwardRef wrapper so parent components can call layout methods.
 */
const MasonrySnapGrid = forwardRef(MasonrySnapGridInner) as <T>(
    props: MasonrySnapGridProps<T> & { ref?: React.ForwardedRef<MasonrySnapGridRef> }
) => ReturnType<typeof MasonrySnapGridInner>;

export default MasonrySnapGrid;
