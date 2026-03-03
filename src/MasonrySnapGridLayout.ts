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
            ...options,
        };

        // Cache initial width (useful when first measuring)
        this.lastContainerWidth = typeof container.clientWidth === 'number' ? container.clientWidth : 0;

        this.useCssMasonry = this.shouldUseCssMasonry();

        this.init();
    }

    /**
     * Initialize layout: applies base classes, renders initial items,
     * and sets up resize monitoring.
     */
    private init(): void {
        if (this.isDestroyed) return;

        this.container.classList.add(this.options.classNames.container || '');
        this.container.dataset.masonryMode = this.useCssMasonry ? 'css' : 'js';
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

        const newItems = this.options.items || [];
        const needed = newItems.length;

        // Ensure pool has enough elements
        for (let i = this.itemPool.length; i < needed; i++) {
            const el = document.createElement('div');
            if (this.options.classNames?.item) el.classList.add(this.options.classNames.item);
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
                    itemElement.appendChild(content);
                }
            } else {
                // Fallback: clear content
                itemElement.innerHTML = '';
            }

            // Ensure element has the item class
            if (this.options.classNames?.item && !itemElement.classList.contains(this.options.classNames.item)) {
                itemElement.classList.add(this.options.classNames.item);
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
            if (item.parentElement === this.container) item.remove();
        }

        // Trigger layout
        this.updateLayout();
    }

    /**
     * Sets up a ResizeObserver on the container to trigger re-layout
     * when width changes — throttled to animation frames for performance.
     */
    private setupResizeObserver(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(() => {
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.rafId = requestAnimationFrame(() => {
                const newWidth = this.container.clientWidth;
                if (newWidth !== this.lastContainerWidth) {
                    this.lastContainerWidth = newWidth;
                    this.updateLayout();
                }
            });
        });

        this.resizeObserver.observe(this.container);
    }

    /**
     * Core layout function:
     * - Calculates number of columns based on container width & min column width
     * - Measures all items to avoid forced reflows during positioning
     * - Positions items in the shortest column to maintain balance
     */
    private updateLayout(): void {
        if (this.isDestroyed || !this.container.isConnected) return;

        try {
            if (this.useCssMasonry) {
                this.applyCssMasonryLayout();
                return;
            }

            const { gutter, minColWidth, animate, transitionDuration } = this.options;
            const containerWidth = this.container.clientWidth;

            // Avoid layout if container is hidden or collapsed
            if (containerWidth <= 0) {
                this.container.style.height = '0';
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
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`;
        // Native masonry row behavior (supported in modern Chromium / Firefox)
        (this.container.style as any).gridTemplateRows = 'masonry';
        (this.container.style as any).gridAutoRows = 'masonry';
        this.container.style.gridAutoFlow = 'dense';
        this.container.style.gap = `${gutter}px`;
        // Let the browser control height; clear JS-controlled height
        this.container.style.height = '';

        // Items participate in normal grid flow; clear JS positioning styles
        this.items.forEach(item => {
            item.style.position = '';
            item.style.transform = '';
            item.style.transition = '';
            item.style.willChange = '';
            item.style.width = '100%';
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

            item.style.display = 'block';
            item.style.visibility = 'hidden';
            item.style.position = 'absolute';
            item.style.width = `${colWidth}px`;

            const height = item.offsetHeight;

            Object.assign(item.style, originalStyles);
            return height;
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
            const height = itemHeights[index];
            const minCol = this.findShortestColumn();
            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            item.style.width = `${colWidth}px`;
            item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            item.style.transition = animate
                ? `transform ${transitionDuration}ms ease`
                : 'none';
            item.style.willChange = 'transform';

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
        this.container.style.height = `${containerHeight}px`;
    }

    /**
     * Simple fallback layout in case the Masonry calculation fails:
     * stacks items vertically in one column.
     */
    private applyFallbackLayout(): void {
        let top = 0;
        this.items.forEach(item => {
            item.style.transform = `translate3d(0, ${top}px, 0)`;
            top += item.offsetHeight + this.options.gutter;
        });
        this.container.style.height = `${top - this.options.gutter}px`;
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
        this.options.items = newItems;
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

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.resizeObserver = undefined;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        this.container.innerHTML = '';
        this.container.removeAttribute('style');
        delete this.container.dataset.masonryMode;
        this.container.classList.remove(this.options.classNames.container || '');

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
