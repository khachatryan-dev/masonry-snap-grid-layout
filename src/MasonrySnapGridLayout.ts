import { MasonrySnapGridLayoutClassNames, MasonrySnapGridLayoutOptions } from './types';

export default class MasonrySnapGridLayout {
    private readonly container: HTMLElement;
    private readonly options: Required<MasonrySnapGridLayoutOptions>;
    private classNames: Required<MasonrySnapGridLayoutClassNames>;

    private items: HTMLElement[] = [];
    private positions: { x: number; y: number; width: number; height: number }[] = [];
    private columnHeights: number[] = [];
    private columns: number = 0;
    private lastPositions: typeof this.positions = [];
    private resizeRaf: number | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions = {}) {
        this.container = container;
        this.classNames = {
            container: 'masonry-snap-grid-container',
            item: 'masonry-snap-grid-item',
            ...(options.classNames || {}),
        };

        this.options = {
            gutter: 16,
            minColWidth: 250,
            animate: true,
            transitionDuration: 400,
            classNames: this.classNames,
            ...options,
        };

        this.container.classList.add(this.classNames.container);
        this.init();
    }

    private init() {
        this.setupEventListeners();
        this.calculateLayout();
        this.applyLayout(false);
    }

    private setupEventListeners() {
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.container);
    }

    public setItems(items: HTMLElement[]) {
        // Clear existing items
        this.items.forEach(item => item.remove());
        this.items = [];

        // Add new items
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            item.classList.add(this.classNames.item);
            fragment.appendChild(item);
            this.items.push(item);
        });

        this.container.appendChild(fragment);
        this.calculateLayout();
        this.applyLayout(true);
    }

    public calculateLayout() {
        const { gutter, minColWidth } = this.options;
        const containerWidth = this.container.clientWidth;

        // Calculate column count and width
        this.columns = Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
        const colWidth = (containerWidth - (this.columns - 1) * gutter) / this.columns;

        // Reset layout state
        this.lastPositions = [...this.positions];
        this.columnHeights = new Array(this.columns).fill(0);
        this.positions = [];

        // Calculate item positions
        this.items.forEach((item, i) => {
            const height = item.offsetHeight;
            const minCol = this.findShortestColumn();
            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            this.positions[i] = { x, y, width: colWidth, height };
            this.columnHeights[minCol] += height + gutter;
        });

        // Set container height
        this.container.style.height = `${Math.max(...this.columnHeights)}px`;
    }

    private findShortestColumn(): number {
        let minIndex = 0;
        for (let i = 1; i < this.columns; i++) {
            if (this.columnHeights[i] < this.columnHeights[minIndex]) {
                minIndex = i;
            }
        }
        return minIndex;
    }

    public applyLayout(animate: boolean = false) {
        const duration = this.options.transitionDuration;

        this.items.forEach((item, i) => {
            const pos = this.positions[i] || { x: 0, y: 0, width: 0 };
            const lastPos = this.lastPositions[i] || { x: 0, y: 0 };

            item.style.width = `${pos.width}px`;

            if (animate && this.options.animate) {
                const dx = lastPos.x - pos.x;
                const dy = lastPos.y - pos.y;

                item.style.transition = 'none';
                item.style.transform = `translate3d(${pos.x + dx}px, ${pos.y + dy}px, 0)`;

                // Trigger reflow
                void item.offsetHeight;

                item.style.transition = `transform ${duration}ms ease`;
                item.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
            } else {
                item.style.transition = 'none';
                item.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
            }
        });
    }

    private handleResize() {
        if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
        this.resizeRaf = requestAnimationFrame(() => {
            this.calculateLayout();
            this.applyLayout(true);
        });
    }

    public destroy(): void {
        this.resizeObserver?.disconnect();
        if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);

        this.container.innerHTML = '';
        this.container.removeAttribute('style');
        this.container.classList.remove(this.classNames.container);

        // Reset state
        this.items = [];
        this.positions = [];
        this.columnHeights = [];
        this.columns = 0;
        this.lastPositions = [];
    }
}