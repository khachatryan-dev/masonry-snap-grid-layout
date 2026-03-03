import { MasonrySnapGridLayoutOptions } from './types';

export default class MasonrySnapGridLayout<T = any> {
    // Main container for the grid
    private readonly container: HTMLElement;
    // Normalized config options with defaults applied
    private readonly options: Required<MasonrySnapGridLayoutOptions<T>>;
    // Active DOM elements currently in the layout
    private items: HTMLElement[] = [];
    // Running height for each column (used for placement calculations)
    private columnHeights: number[] = [];
    // Resize observer to detect container width changes
    private resizeObserver: ResizeObserver | undefined;
    // Tracks a pending animation frame request for layout updates
    private rafId: number | null = null;
    // Cache last measured container width to avoid unnecessary relayouts
    private lastContainerWidth = 0;
    // Pool of DOM elements for recycling between renders (avoids costly re-creation)
    private itemPool: HTMLElement[] = [];
    // Flag to prevent operations after destruction
    private isDestroyed = false;
    // Whether the current environment supports native CSS masonry
    private readonly useCssMasonry: boolean;
    // Whether the layout has been mounted (init called)
    private mounted = false;

    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions<T>) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.container = container;
        // Merge user-provided options with defaults
        this.options = {
            layoutMode: 'auto',
            gutter: 16,
            minColWidth: 250,
            animate: true,
            transitionDuration: 400,
            classNames: {
                container: 'masonry-snap-grid-container',
                item: 'masonry-snap-grid-item',
            },
            autoMount: true,
            ...options,
        } as Required<MasonrySnapGridLayoutOptions<T>>;

        // Cache initial width (useful when first measuring)
        this.lastContainerWidth = typeof container.clientWidth === 'number' ? container.clientWidth : 0;

        this.useCssMasonry = this.shouldUseCssMasonry();

        // Auto-mount only when requested and environment looks like a browser and container is attached
        if (this.options.autoMount && typeof window !== 'undefined' && typeof document !== 'undefined' && container.isConnected) {
            this.mount();
        }
    }

    /**
     * Public mount method — initializes the layout when the consumer decides
     * to take control (useful for SSR/hydration scenarios).
     */
    public mount(): void {
        if (this.isDestroyed || this.mounted) return;
        // Guard against non-browser environments
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (!this.container || !this.container.isConnected) return;

        this.init();
        this.mounted = true;
    }

    /**
     * Initialize layout: applies base classes, renders initial items,
     * and sets up resize monitoring.
     */
    private init(): void {
        if (this.isDestroyed) return;
        if (!this.container) return;

        const containerClass = this.options.classNames.container || '';
        if (containerClass) this.container.classList.add(containerClass);
        try {
            this.container.dataset.masonryMode = this.useCssMasonry ? 'css' : 'js';
        } catch (e) {
            // Some environments may not allow dataset; ignore safely
        }

        this.renderItems();
        if (!this.useCssMasonry) {
            this.setupResizeObserver();
        }
    }

    /**
     * Renders items into the container using a pooled DOM strategy:
     * - Reuses elements where possible
     * - Creates new nodes when needed
     * - Removes unused pool items when shrinking
     *
     * This implementation avoids fragile index-based orphan checks and
     * appends only missing nodes while updating existing ones in-place.
     */
    private renderItems(): void {
        if (this.isDestroyed) return;
        if (!this.container) return;

        const newItems = this.options.items || [];
        const needed = newItems.length;

        // Ensure pool has enough elements
        for (let i = this.itemPool.length; i < needed; i++) {
            const el = document.createElement('div');
            const itemClass = this.options.classNames && this.options.classNames.item;
            if (itemClass) el.classList.add(itemClass);
            this.itemPool[i] = el;
        }

        // Update or append each pooled element for the current items
        this.items = new Array(needed);

        for (let i = 0; i < needed; i++) {
            const itemData = newItems[i];
            const itemElement = this.itemPool[i];

            // Render content via provided renderItem function
            const content = this.options.renderItem(itemData);

            if (typeof content === 'string') {
                // string content - set innerHTML
                itemElement.innerHTML = content;
            } else if (content instanceof Node) {
                // If the provided node is already the same as the only child, avoid re-append
                if (itemElement.firstChild !== content) {
                    // Clear existing contents and append the new node
                    itemElement.innerHTML = '';
                    try {
                        itemElement.appendChild(content);
                    } catch (e) {
                        // Append may fail in some test harnesses – fallback to innerHTML when possible
                        itemElement.innerHTML = (content as any).outerHTML || '';
                    }
                }
            } else {
                // Fallback: clear content
                itemElement.innerHTML = '';
            }

            // Ensure element has the item class
            const itemClass = this.options.classNames && this.options.classNames.item;
            if (itemClass && !itemElement.classList.contains(itemClass)) {
                itemElement.classList.add(itemClass);
            }

            // Append to container if not already attached (preserve existing nodes)
            if (itemElement.parentElement !== this.container) {
                this.container.appendChild(itemElement);
            }

            this.items[i] = itemElement;
        }

        // Trim excess pooled items (remove extra nodes from DOM)
        while (this.itemPool.length > needed) {
            const item = this.itemPool.pop()!;
            if (item.parentElement === this.container) {
                try { item.remove(); } catch (e) { /* ignore */ }
            }
        }

        // Trigger layout
        this.updateLayout();
    }

    /**
     * Sets up a ResizeObserver on the container to trigger re-layout
     * when width changes — throttled to animation frames for performance.
     */
    private setupResizeObserver(): void {
        // Disconnect previous observer if any
        try {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
        } catch (e) {
            // ignore
        }

        // Guard for environments without ResizeObserver
        if (typeof window === 'undefined' || typeof (window as any).ResizeObserver === 'undefined') {
            return;
        }

        this.resizeObserver = new (window as any).ResizeObserver(() => {
            if (this.rafId) try { cancelAnimationFrame(this.rafId); } catch (e) { /* ignore */ }
            this.rafId = requestAnimationFrame(() => {
                const newWidth = this.container ? this.container.clientWidth : 0;
                if (newWidth !== this.lastContainerWidth) {
                    this.lastContainerWidth = newWidth;
                    this.updateLayout();
                }
            });
        });

        try {
            if (this.resizeObserver) {
                this.resizeObserver.observe(this.container);
            }
        } catch (e) {
            // some environments may not allow observe; ignore
        }
    }

    /**
     * Core layout function:
     * - Calculates number of columns based on container width & min column width
     * - Measures all items to avoid forced reflows during positioning
     * - Positions items in the shortest column to maintain balance
     */
    private updateLayout(): void {
        if (this.isDestroyed || !this.container || !this.container.isConnected) return;

        try {
            if (this.useCssMasonry) {
                this.applyCssMasonryLayout();
                return;
            }

            const { gutter, minColWidth, animate, transitionDuration } = this.options;
            const containerWidth = this.container.clientWidth;

            // Avoid layout if container is hidden or collapsed
            if (containerWidth <= 0) {
                try { this.container.style.height = '0'; } catch (e) { /* ignore */ }
                return;
            }

            // Determine column count and width
            const columns = Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
            const colWidth = (containerWidth - (columns - 1) * gutter) / columns;

            // Reset tracking for column heights
            this.columnHeights = new Array(columns).fill(0);

            // Measure all items with the new column width before positioning
            const itemHeights = this.measureItems(colWidth);

            // Place each item in the shortest available column
            this.positionItems(colWidth, gutter, animate, transitionDuration, itemHeights);

            // Adjust container height to fit the tallest column
            this.setContainerHeight(gutter);
        } catch (error) {
            console.error('Masonry layout failed:', error);
            // Fallback: simple vertical stacking
            this.applyFallbackLayout();
        }
    }

    /**
     * Applies a native CSS masonry layout when supported by the browser.
     * This avoids manual JavaScript positioning and lets the browser
     * handle column balancing and reflow.
     */
    private applyCssMasonryLayout(): void {
        const { gutter, minColWidth } = this.options;

        // Configure container as a CSS masonry grid
        try { this.container.style.display = 'grid'; } catch (e) { /* ignore */ }
        try { this.container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`; } catch (e) { /* ignore */ }
        try { (this.container.style as any).gridTemplateRows = 'masonry'; } catch (e) { /* ignore */ }
        try { (this.container.style as any).gridAutoRows = 'masonry'; } catch (e) { /* ignore */ }
        try { this.container.style.gridAutoFlow = 'dense'; } catch (e) { /* ignore */ }
        try { this.container.style.gap = `${gutter}px`; } catch (e) { /* ignore */ }
        // Let the browser control height; clear JS-controlled height
        try { this.container.style.height = ''; } catch (e) { /* ignore */ }

        // Items participate in normal grid flow; clear JS positioning styles
        this.items.forEach(item => {
            try { item.style.position = ''; } catch (e) {}
            try { item.style.transform = ''; } catch (e) {}
            try { item.style.transition = ''; } catch (e) {}
            try { item.style.willChange = ''; } catch (e) {}
            try { item.style.width = '100%'; } catch (e) {}
        });
    }

    /**
     * Measures item heights without affecting layout:
     * - Temporarily forces block layout for accurate measurement
     * - Restores original styles after measuring
     */
    private measureItems(colWidth: number): number[] {
        return this.items.map(item => {
            const originalStyles = {
                display: item.style.display,
                visibility: item.style.visibility,
                position: item.style.position,
                width: item.style.width
            };

            try {
                item.style.display = 'block';
                item.style.visibility = 'hidden';
                item.style.position = 'absolute';
                item.style.width = `${colWidth}px`;

                const height = item.offsetHeight;

                Object.assign(item.style, originalStyles);
                return height;
            } catch (e) {
                // If measurement fails, return a conservative default
                try { Object.assign(item.style, originalStyles); } catch (e) {}
                return item.offsetHeight || 0;
            }
        });
    }

    /**
     * Positions items column-by-column:
     * - Chooses the shortest column for each item to maintain balance
     * - Uses transform for GPU-accelerated positioning
     */
    private positionItems(
        colWidth: number,
        gutter: number,
        animate: boolean,
        transitionDuration: number,
        itemHeights: number[]
    ): void {
        this.items.forEach((item, index) => {
            const height = itemHeights[index] || item.offsetHeight || 0;
            const minCol = this.findShortestColumn();
            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            try { item.style.width = `${colWidth}px`; } catch (e) {}
            try { item.style.transform = `translate3d(${x}px, ${y}px, 0)`; } catch (e) {}
            try { item.style.transition = animate
                ? `transform ${transitionDuration}ms ease`
                : 'none'; } catch (e) {}
            try { item.style.willChange = 'transform'; } catch (e) {}

            this.columnHeights[minCol] += height + gutter;
        });
    }

    /**
     * Sets the container height to match the tallest column
     * while subtracting trailing gutter space for a clean edge.
     */
    private setContainerHeight(gutter: number): void {
        const maxHeight = Math.max(0, ...this.columnHeights);
        const containerHeight = maxHeight > 0 ? maxHeight - gutter : 0;
        try { this.container.style.height = `${containerHeight}px`; } catch (e) {}
    }

    /**
     * Simple fallback layout in case the Masonry calculation fails:
     * stacks items vertically in one column.
     */
    private applyFallbackLayout(): void {
        let top = 0;
        this.items.forEach(item => {
            try { item.style.transform = `translate3d(0, ${top}px, 0)`; } catch (e) {}
            top += item.offsetHeight + this.options.gutter;
        });
        try { this.container.style.height = `${top - this.options.gutter}px`; } catch (e) {}
    }

    /**
     * Finds the column with the least accumulated height.
     */
    private findShortestColumn(): number {
        let minIndex = 0;
        let minHeight = Infinity;

        this.columnHeights.forEach((height, index) => {
            if (height < minHeight) {
                minHeight = height;
                minIndex = index;
            }
        });

        return minIndex;
    }

    /**
     * Public method to replace current items and trigger a full re-render.
     */
    public updateItems(newItems: T[]): void {
        if (this.isDestroyed) return;
        this.options.items = newItems as any;
        // If not mounted yet, do not attempt to render. Caller should call mount().
        if (!this.mounted) return;
        this.renderItems();
    }

    /**
     * Cleanly tears down the layout:
     * - Stops observing size changes
     * - Cancels pending animation frames
     * - Clears DOM references and resets container
     */
    public destroy(): void {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        try {
            if (this.resizeObserver) {
                try { this.resizeObserver.disconnect(); } catch (e) { /* ignore */ }
            }
        } catch (e) {
            // ignore errors
        }
        this.resizeObserver = undefined;

        if (this.rafId) {
            try { cancelAnimationFrame(this.rafId); } catch (e) { /* ignore */ }
            this.rafId = null;
        }

        try { this.container.innerHTML = ''; } catch (e) {}
        try { this.container.removeAttribute('style'); } catch (e) {}
        try { delete (this.container as any).dataset.masonryMode; } catch (e) {}

        try { this.container.classList.remove(this.options.classNames.container || ''); } catch (e) {}

        this.items = [];
        this.columnHeights = [];
        this.itemPool = [];
    }

    /**
     * Determines whether the current environment supports CSS masonry
     * and whether it should be used based on user preferences.
     */
    private shouldUseCssMasonry(): boolean {
        const mode = this.options.layoutMode ?? 'auto';

        // In non-browser environments (SSR), always fall back to JS mode.
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return false;
        }

        const cssSupportsMasonry =
            typeof CSS !== 'undefined' &&
            typeof CSS.supports === 'function' &&
            (
                CSS.supports('grid-template-rows', 'masonry') ||
                CSS.supports('grid-template-columns', 'masonry') ||
                CSS.supports('masonry-auto-flow', 'next')
            );

        if (mode === 'js') return false;
        if (mode === 'css') return cssSupportsMasonry;

        // auto mode: prefer CSS masonry when available and on known engines
        if (!cssSupportsMasonry) return false;

        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isChromium = /Chrome|Chromium|Edg|OPR/.test(ua);
        const isFirefox = /Firefox/.test(ua);

        return isChromium || isFirefox;
    }
}
