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
    private boundResizeHandler = this.handleResize.bind(this);

    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions = {}) {
        this.container = container;
        this.classNames = {
            container: 'masonry-snap-grid-container',
            item: 'masonry-snap-grid-item',
            itemContent: 'masonry-snap-grid-item-content',
            itemHeader: 'masonry-snap-grid-item-header',
            itemTitle: 'masonry-snap-grid-item-title',
            itemId: 'masonry-snap-grid-item-id',
            itemBody: 'masonry-snap-grid-item-body',
            progressBar: 'masonry-snap-grid-progress-bar',
            progress: 'masonry-snap-grid-progress',
            itemFooter: 'masonry-snap-grid-item-footer',
            ...(options.classNames || {}),
        }
        this.options = {
            gutter: 16,
            minColWidth: 250,
            animate: true,
            transitionDuration: 400,
            initialItems: 0,
            itemContent: null,
            classNames: this.classNames,
            ...options,
        };


        this.container.classList.add(this.classNames.container);
        this.init();
    }

    private init() {
        this.setupEventListeners();
        this.generateItems(this.options.initialItems);
        this.calculateLayout();
        this.applyLayout(false);
    }

    private setupEventListeners() {
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.container);

        window.addEventListener('resize', this.boundResizeHandler);
    }

    public generateItems(count: number) {
        if (count < this.items.length) {
            this.items.slice(count).forEach((item) => item.remove());
            this.items = this.items.slice(0, count);
            return;
        }

        const startIndex = this.items.length;
        const fragment = document.createDocumentFragment();

        for (let i = startIndex; i < count; i++) {
            const item = this.createItem(i);
            fragment.appendChild(item);
            this.items.push(item);
        }

        this.container.appendChild(fragment);
    }

    private createItem(index: number): HTMLElement {
        const div = document.createElement('div');
        div.className = this.classNames.item;

        const contentOption = this.options.itemContent;
        let content: HTMLElement | string;

        if (typeof contentOption === 'function') {
            content = contentOption(index);
        } else if (contentOption instanceof HTMLElement || typeof contentOption === 'string') {
            content = contentOption;
        } else {
            content = `Item ${index + 1}`;
        }

        if (typeof content === 'string') {
            div.textContent = content;
        } else {
            div.appendChild(content);
        }

        // Assigning height dynamically for layout simulation (no styles applied)
        const height = 120 + Math.floor(Math.random() * 100);
        div.style.height = `${height}px`;

        return div;
    }

    public calculateLayout() {
        const { gutter, minColWidth } = this.options;
        const containerWidth = this.container.clientWidth;

        this.columns = Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
        const colWidth = (containerWidth - (this.columns - 1) * gutter) / this.columns;

        this.lastPositions = [...this.positions];
        this.columnHeights = new Array(this.columns).fill(0);
        this.positions = [];

        this.items.forEach((item, i) => {
            const height = item.offsetHeight;

            let minCol = 0;
            for (let c = 1; c < this.columns; c++) {
                if (this.columnHeights[c] < this.columnHeights[minCol]) {
                    minCol = c;
                }
            }

            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            this.positions[i] = { x, y, width: colWidth, height };
            this.columnHeights[minCol] += height + gutter;
        });

        const maxHeight = Math.max(...this.columnHeights);
        this.container.style.height = `${maxHeight}px`;
    }

    applyLayout(animate: boolean = false) {
        const duration = this.options.transitionDuration;

        this.items.forEach((item, i) => {
            const pos = this.positions[i] || { x: 0, y: 0, width: 0 };
            const lastPos = this.lastPositions[i] || { x: 0, y: 0 };

            item.style.width = `${pos.width}px`;

            if (animate) {
                const dx = lastPos.x - pos.x;
                const dy = lastPos.y - pos.y;

                item.style.transition = 'none';
                item.style.transform = `translate3d(${pos.x + dx}px, ${pos.y + dy}px, 0)`;
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

    public shuffleItems() {
        for (let i = this.items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
        }

        const fragment = document.createDocumentFragment();
        this.items.forEach((item) => fragment.appendChild(item));
        this.container.appendChild(fragment);

        this.calculateLayout();
        this.applyLayout(true);
    }

    public addItems(count: number) {
        const newCount = this.items.length + count;
        this.generateItems(newCount);
        this.calculateLayout();
        this.applyLayout(true);
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        window.removeEventListener('resize', this.boundResizeHandler);

        if (this.resizeRaf) {
            cancelAnimationFrame(this.resizeRaf);
            this.resizeRaf = null;
        }

        this.container.innerHTML = '';
        this.container.removeAttribute('style');
        this.container.classList.remove(this.classNames.container);

        this.items = [];
        this.positions = [];
        this.columnHeights = [];
        this.columns = 0;
        this.lastPositions = [];
    }
}