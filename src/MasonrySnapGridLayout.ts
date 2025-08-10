import { MasonrySnapGridLayoutOptions } from './types';

/**
 * MasonrySnapGridLayout
 *
 * A lightweight, generic TypeScript implementation of a responsive Masonry-style grid layout
 * with optional animations, custom rendering, and automatic re-layout on resize.
 *
 * @template T - The type of data items that will be rendered into grid elements.
 */
export default class MasonrySnapGridLayout<T = any> {
    /** The container element where the Masonry grid will be rendered. */
    private readonly container: HTMLElement;

    /** Fully resolved options object with defaults merged. */
    private readonly options: Required<MasonrySnapGridLayoutOptions<T>>;

    /** A reference to all grid item elements currently rendered. */
    private items: HTMLElement[] = [];

    /** Tracks the current heights of each column to position new items. */
    private columnHeights: number[] = [];

    /** Observes container resizing to trigger re-layout. */
    private resizeObserver: ResizeObserver | undefined;

    /** Stores requestAnimationFrame ID for layout updates to prevent redundant calls. */
    private rafId: number | null = null;

    /**
     * Creates a new MasonrySnapGridLayout instance.
     *
     * @param container - The HTML element that will act as the grid container.
     * @param options - Partial configuration object for layout behavior and rendering.
     */
    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions<T>) {
        this.container = container;

        // Merge default settings with user-provided options
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

        // Apply base container class for styling
        this.container.classList.add(this.options.classNames.container || "");

        // Initial rendering and layout setup
        this.renderItems();
        this.setupResizeObserver();
    }

    /**
     * Renders the provided items into the container.
     * Clears previous items and re-builds DOM structure.
     */
    private renderItems() {
        // Remove any previously rendered items
        this.items.forEach(item => item.remove());
        this.items = [];

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();

        // Create elements for each item and append to fragment
        this.options.items.forEach(itemData => {
            const itemElement = this.options.renderItem(itemData);
            itemElement.classList.add(this.options.classNames.item || "");
            fragment.appendChild(itemElement);
            this.items.push(itemElement);
        });

        // Append all items to container at once
        this.container.appendChild(fragment);

        // Trigger layout positioning
        this.updateLayout();
    }

    /**
     * Sets up a ResizeObserver to re-calculate layout when container size changes.
     */
    private setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            // Throttle updates to animation frame to avoid layout thrashing
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.rafId = requestAnimationFrame(() => this.updateLayout());
        });
        this.resizeObserver.observe(this.container);
    }

    /**
     * Calculates item positions and updates their transforms.
     * Also adjusts the container height to fit all items.
     */
    private updateLayout() {
        const { gutter, minColWidth, animate, transitionDuration } = this.options;
        const containerWidth = this.container.clientWidth;

        // Determine number of columns based on available width and minColWidth
        const columns = Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));

        // Calculate actual column width including gutters
        const colWidth = (containerWidth - (columns - 1) * gutter) / columns;

        // Reset heights for all columns
        this.columnHeights = new Array(columns).fill(0);

        // Position each item in the shortest column
        this.items.forEach((item) => {
            const height = item.offsetHeight;
            const minCol = this.findShortestColumn();
            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            // Apply positioning and animation
            item.style.width = `${colWidth}px`;
            item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            item.style.transition = animate
                ? `transform ${transitionDuration}ms ease`
                : 'none';

            // Update column height to account for this item
            this.columnHeights[minCol] += height + gutter;
        });

        // Set container height to the tallest column
        const maxHeight = Math.max(...this.columnHeights);
        this.container.style.height = `${maxHeight}px`;
    }

    /**
     * Finds the index of the column with the smallest total height.
     *
     * @returns Index of the shortest column.
     */
    private findShortestColumn(): number {
        return this.columnHeights.indexOf(Math.min(...this.columnHeights));
    }

    /**
     * Replaces current items with a new set and re-renders the layout.
     *
     * @param newItems - New set of data items to render.
     */
    public updateItems(newItems: T[]) {
        this.options.items = newItems;
        this.renderItems();
    }

    /**
     * Cleans up event listeners, observers, and DOM modifications.
     * This should be called before discarding the instance.
     */
    public destroy() {
        this.resizeObserver?.disconnect();
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.container.innerHTML = '';
        this.container.removeAttribute('style');
        this.container.classList.remove(this.options.classNames.container || "");
    }
}
