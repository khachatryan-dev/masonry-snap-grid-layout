import { MasonrySnapGridLayoutOptions } from './types';

export default class MasonrySnapGridLayout<T = any> {
    private readonly container: HTMLElement;
    private readonly options: Required<MasonrySnapGridLayoutOptions<T>>;
    private items: HTMLElement[] = [];
    private columnHeights: number[] = [];
    private resizeObserver: ResizeObserver | undefined;
    private rafId: number | null = null;

    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions<T>) {
        this.container = container;
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

        // Apply container class
        this.container.classList.add(this.options.classNames.container || "");

        // Initialize
        this.renderItems();
        this.setupResizeObserver();
    }

    private renderItems() {
        // Clear existing items
        this.items.forEach(item => item.remove());
        this.items = [];

        // Create fragment for batch DOM insertion
        const fragment = document.createDocumentFragment();

        // Create and append items
        this.options.items.forEach(itemData => {
            const itemElement = this.options.renderItem(itemData);
            itemElement.classList.add(this.options.classNames.item|| "");
            fragment.appendChild(itemElement);
            this.items.push(itemElement);
        });

        this.container.appendChild(fragment);
        this.updateLayout();
    }

    private setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.rafId = requestAnimationFrame(() => this.updateLayout());
        });
        this.resizeObserver.observe(this.container);
    }

    private updateLayout() {
        const { gutter, minColWidth, animate, transitionDuration } = this.options;
        const containerWidth = this.container.clientWidth;

        // Calculate columns
        const columns = Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
        const colWidth = (containerWidth - (columns - 1) * gutter) / columns;

        // Reset column heights
        this.columnHeights = new Array(columns).fill(0);

        // Position items
        this.items.forEach((item) => {
            const height = item.offsetHeight;
            const minCol = this.findShortestColumn();
            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            // Apply position and size
            item.style.width = `${colWidth}px`;
            item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            item.style.transition = animate
                ? `transform ${transitionDuration}ms ease`
                : 'none';

            // Update column height
            this.columnHeights[minCol] += height + gutter;
        });

        // Set container height
        const maxHeight = Math.max(...this.columnHeights);
        this.container.style.height = `${maxHeight}px`;
    }

    private findShortestColumn(): number {
        return this.columnHeights.indexOf(Math.min(...this.columnHeights));
    }

    public updateItems(newItems: T[]) {
        this.options.items = newItems;
        this.renderItems();
    }

    public destroy() {
        this.resizeObserver?.disconnect();
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.container.innerHTML = '';
        this.container.removeAttribute('style');
        this.container.classList.remove(this.options.classNames.container || "");
    }
}