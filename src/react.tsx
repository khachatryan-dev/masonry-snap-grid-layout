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
 * Helper: wait for all <img> inside "el" to load (or error) with a timeout fallback.
 * Returns a promise that resolves when all images are either loaded or the timeout hits.
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
            // small microtask delay to ensure layout has applied
            requestAnimationFrame(() => resolve());
        };

        const onLoadOrError = () => {
            remaining -= 1;
            if (remaining <= 0) finish();
        };

        images.forEach((img) => {
            if (img.complete) {
                // already finished (loaded or errored)
                onLoadOrError();
            } else {
                img.addEventListener('load', onLoadOrError, { once: true });
                img.addEventListener('error', onLoadOrError, { once: true });
            }
        });

        // Timeout fallback — in case images hang or take too long
        setTimeout(() => finish(), timeout);
    });
}

/**
 * React wrapper for MasonrySnapGridLayout that supports SSR-friendly rendering.
 *
 * SSR Strategy:
 * - On the server: render all items normally with React → HTML is SEO-friendly & visible without JS.
 * - On the client: after hydration, remove the static HTML and let MasonrySnapGridLayout take over.
 *
 * Fixes:
 * - Delay initial layout until after paint (rAF) so measurements are correct.
 * - Wait for images to load (with a timeout fallback) before triggering layout.
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
     * Server-side / initial render:
     * We render items as plain HTML so they are visible for SSR & SEO.
     * Styling here should approximate the final look to minimize CLS.
     */
    const serverRenderedItems = (
        <>
            {items.map((item, idx) => (
                // Use inline-block to let items flow before masonry takes over.
                // Consumers can override with their own classes/styles.
                <div key={idx} style={{ display: 'inline-block', verticalAlign: 'top' }}>
                    {renderItem(item)}
                </div>
            ))}
        </>
    );

    /**
     * Client takeover effect:
     * - Remove SSR content
     * - Initialize the Masonry instance (but delay the *first layout* until after paint/images)
     */
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Clear any SSR static HTML so Masonry can manage DOM properly.
        container.innerHTML = '';

        // Create the masonry instance. We pass a renderItem factory that creates
        // DOM nodes and mounts React roots into them. The masonry implementation
        // is expected to insert these returned elements into the layout.
        masonryRef.current = new MasonrySnapGridLayout(container, {
            ...options,
            items,
            renderItem: (item) => {
                const div = document.createElement('div');
                // Optional: set a sensible default style class to avoid flash
                div.style.willChange = 'transform, height';
                const root = ReactDOM.createRoot(div);
                root.render(renderItem(item));
                rootsRef.current.set(div, root);
                return div;
            },
        });

        let rafId: number | null = null;
        let cancelled = false;

        // Wait for a paint frame, then wait for images within the container, then trigger layout.
        // This prevents the "stacked" initial state where items have zero measured height.
        const doInitialLayout = async () => {
            // Ensure at least one paint has happened so layout/measurements are meaningful.
            await new Promise<void>((r) => {
                rafId = requestAnimationFrame(() => r());
            });

            // Wait for images inside container (if any) to finish loading or timeout
            await waitForImages(container, 1000);

            if (cancelled) return;

            // Trigger initial layout. Use updateItems to be conservative and generic.
            // If your masonry has a dedicated `layout()` method, call that instead.
            try {
                masonryRef.current?.updateItems(items);
            } catch (e) {
                // Defensive: if updateItems isn't implemented or throws, ignore to avoid crash.
                // You may want to surface this in dev mode.
                // console.warn('Masonry initial layout failed', e);
            }
        };

        // Kick off the layout sequence
        doInitialLayout();

        return () => {
            // cancel RAF if pending
            if (rafId != null) cancelAnimationFrame(rafId);
            cancelled = true;

            // Unmount all React roots & remove their DOM nodes
            rootsRef.current.forEach((root, div) => {
                try {
                    root.unmount();
                } catch (err) {
                    // ignore
                }
                // remove from DOM if still there
                if (div.parentNode) div.remove();
            });
            rootsRef.current.clear();

            // Destroy the masonry instance
            try {
                masonryRef.current?.destroy();
            } catch (err) {
                // ignore if destroy not present or errors
            }
            masonryRef.current = null;
        };
        // NOTE: We intentionally don't include `items` in this dependency array because:
        // - this effect is the "takeover" after initial hydration; re-initializing masonry
        //   on every items change would be expensive.
        // - updates to `items` are handled by the separate `useEffect` below.
        // We keep `options` & `renderItem` because changing these should re-init the library.
    }, [options, renderItem]);

    /**
     * When items change, ask the masonry instance to update.
     * This avoids a full re-initialization and is much faster.
     */
    useEffect(() => {
        if (masonryRef.current) {
            // Defensive: call updateItems inside RAF so layout happens after paint
            // and measurements are consistent.
            requestAnimationFrame(() => {
                try {
                    masonryRef.current?.updateItems(items);
                } catch (e) {
                    // swallow errors to avoid crashing the app
                }
            });
        }
    }, [items]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%', ...style }}
        >
            {/* Static SSR-friendly markup that will be removed during hydrate takeover */}
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
