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

    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions<T>) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.container = container;
        // Merge user-provided options with defaults
        this.options = {
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

        this.init();
    }

    /**
     * Initialize layout: applies base classes, renders initial items,
     * and sets up resize monitoring.
     */
    private init(): void {
        if (this.isDestroyed) return;

        this.container.classList.add(this.options.classNames.container || '');
        this.renderItems();
        this.setupResizeObserver();
    }

    /**
     * Renders items into the container using a pooled DOM strategy:
     * - Avoids DOM churn by reusing elements where possible
     * - Only creates new nodes when needed
     * - Removes unused pool items when shrinking
     */
    private renderItems(): void {
        if (this.isDestroyed) return;

        // Remove orphaned elements from the DOM
        this.items.forEach(item => {
            if (!this.options.items.some((_, i) => this.itemPool[i] === item)) {
                item.remove();
            }
        });

        this.items = [];
        this.columnHeights = [];

        // Use a fragment for batch DOM insertion (better performance)
        const fragment = document.createDocumentFragment();
        this.options.items.forEach((itemData, index) => {
            let itemElement = this.itemPool[index];

            if (!itemElement) {
                itemElement = document.createElement('div');
                itemElement.classList.add(this.options.classNames.item || '');
                this.itemPool[index] = itemElement;
            }

            // Render content via provided renderItem function
            const content = this.options.renderItem(itemData);
            if (typeof content === 'string') {
                itemElement.innerHTML = content;
            } else if (content instanceof Node) {
                itemElement.innerHTML = '';
                itemElement.appendChild(content);
            }

            fragment.appendChild(itemElement);
            this.items.push(itemElement);
        });

        // Trim excess pooled items
        while (this.itemPool.length > this.options.items.length) {
            const item = this.itemPool.pop()!;
            item.remove();
        }

        this.container.appendChild(fragment);
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

        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        this.container.innerHTML = '';
        this.container.removeAttribute('style');
        this.container.classList.remove(this.options.classNames.container || '');

        this.items = [];
        this.columnHeights = [];
        this.itemPool = [];
    }
}
