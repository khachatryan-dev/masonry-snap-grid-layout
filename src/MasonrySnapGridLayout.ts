/**
 * MasonrySnapGridLayout
 * A performant masonry grid layout library with smooth animations,
 * customizable gutter, columns, and dynamic item content.
 *
 * Package name: masonry-snap-grid-layout
 */

import { MasonrySnapGridLayoutClassNames, MasonrySnapGridLayoutOptions } from "./types";

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

    /**
     * Constructor initializes the layout with container element and options
     * @param container HTMLElement container where masonry items are rendered
     * @param options configuration options for layout and styling
     */
    constructor(container: HTMLElement, options: MasonrySnapGridLayoutOptions = {}) {
        this.container = container;

        // Set default options with overrides from user
        this.options = {
            gutter: 16,
            minColWidth: 250,
            animate: true,
            transitionDuration: 400,
            initialItems: 30,
            itemContent: null,
            classNames: {
                container: "masonry-snap-grid-layout-container",
                item: "masonry-snap-grid-layout-item",
                itemContent: "item-content",
                itemHeader: "item-header",
                itemTitle: "item-title",
                itemId: "item-id",
                itemBody: "item-body",
                progressBar: "progress-bar",
                progress: "progress",
                itemFooter: "item-footer",
            },
            ...options,
        };

        // Merge default classNames with user provided classNames
        this.classNames = {
            container: "masonry-snap-grid-layout-container",
            item: "masonry-snap-grid-layout-item",
            itemContent: "item-content",
            itemHeader: "item-header",
            itemTitle: "item-title",
            itemId: "item-id",
            itemBody: "item-body",
            progressBar: "progress-bar",
            progress: "progress",
            itemFooter: "item-footer",
            ...(this.options.classNames || {}),
        };

        // Add container class for styling
        this.container.classList.add(this.classNames.container);

        // Initialize the layout
        this.init();
    }

    /**
     * Initialization: set listeners, generate initial items, layout
     */
    private init() {
        this.setupEventListeners();
        this.generateItems(this.options.initialItems);
        this.calculateLayout();
        this.applyLayout(false);
    }

    /**
     * Setup event listeners for window resize and container resize observer
     */
    private setupEventListeners() {
        // Use ResizeObserver to handle container size changes
        const resizeObserver = new ResizeObserver(() => this.handleResize());
        resizeObserver.observe(this.container);

        window.addEventListener("resize", () => this.handleResize());
    }

    /**
     * Generate specified number of items, removing excess if any
     * @param count number of items to generate
     */
    private generateItems(count: number) {
        // Remove extra items if reducing count
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

    /**
     * Create a single masonry item HTMLElement, with content from renderItemContent callback or default template
     * @param index index of the item
     * @returns HTMLElement for the item
     */
    private createItem(index: number): HTMLElement {
        const div = document.createElement("div");
        div.className = this.classNames.item;

        const contentOption = this.options.itemContent;

        // Determine content type: function, static HTMLElement, static string, or fallback to default
        let content: HTMLElement | string;

        if (typeof contentOption === "function") {
            // Call function with index to get content
            content = contentOption(index);
        } else if (contentOption instanceof HTMLElement || typeof contentOption === "string") {
            // Use static content
            content = contentOption;
        } else {
            // Fallback to default item content template string
            content = this.defaultItemContent(index);
        }

        // Insert content into item element
        if (typeof content === "string") {
            div.innerHTML = content;
        } else {
            div.appendChild(content);
        }

        // Random height to simulate masonry effect
        const height = 120 + Math.floor(Math.random() * 180);
        div.style.height = `${height}px`;

        // Color with HSL for distinct appearance
        const hue = (index * 137.508) % 360; // golden angle
        div.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue + 40}, 70%, 50%))`;

        return div;
    }

    /**
     * Default item content template string
     * @param index index of the item
     * @returns string HTML template for item content
     */
    private defaultItemContent(index: number): string {
        return `
      <div class="${this.classNames.itemContent}">
        <div class="${this.classNames.itemHeader}">
          <div class="${this.classNames.itemTitle}">Item ${index + 1}</div>
          <div class="${this.classNames.itemId}">#${index + 1}</div>
        </div>
        <div class="${this.classNames.itemBody}">
          <div class="${this.classNames.progressBar}">
            <div class="${this.classNames.progress}"></div>
          </div>
        </div>
        <div class="${this.classNames.itemFooter}">
          ${this.getRandomEmoji()}
        </div>
      </div>
    `;
    }

    /**
     * Returns a random emoji from a fixed set for item footer
     */
    private getRandomEmoji(): string {
        const emojis = ["🚀", "✨", "🔥", "💡", "🌟", "🎯", "⚡", "💻", "🔧", "📊"];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    /**
     * Calculate positions of each item in masonry grid based on container width, gutter, min column width
     */
    private calculateLayout() {
        const { gutter, minColWidth } = this.options;
        const containerWidth = this.container.clientWidth;

        // Calculate number of columns that fit
        this.columns = Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));

        // Calculate each column width
        const colWidth = (containerWidth - (this.columns - 1) * gutter) / this.columns;

        // Store previous positions for animation
        this.lastPositions = [...this.positions];

        // Reset column heights array
        this.columnHeights = new Array(this.columns).fill(0);
        this.positions = [];

        // Calculate position for each item and assign column
        this.items.forEach((item, i) => {
            const height = item.offsetHeight;

            // Find the shortest column index
            let minCol = 0;
            for (let c = 1; c < this.columns; c++) {
                if (this.columnHeights[c] < this.columnHeights[minCol]) {
                    minCol = c;
                }
            }

            // Calculate item's x,y position
            const x = minCol * (colWidth + gutter);
            const y = this.columnHeights[minCol];

            // Save calculated position
            this.positions[i] = { x, y, width: colWidth, height };

            // Update column height to include this item + gutter
            this.columnHeights[minCol] += height + gutter;
        });

        // Set container height to max column height for proper scrolling
        const maxHeight = Math.max(...this.columnHeights);
        this.container.style.height = `${maxHeight}px`;
    }

    /**
     * Apply calculated positions to each item with optional animation
     * @param animate whether to animate layout changes (default false)
     */
    private applyLayout(animate: boolean = false) {
        const duration = this.options.transitionDuration;

        this.items.forEach((item, i) => {
            const pos = this.positions[i] || { x: 0, y: 0, width: 0 };
            const lastPos = this.lastPositions[i] || { x: 0, y: 0 };

            // Set item width for responsive columns
            item.style.width = `${pos.width}px`;

            if (animate) {
                // Calculate differences for smooth animation
                const dx = lastPos.x - pos.x;
                const dy = lastPos.y - pos.y;

                // Apply initial transform to old position (without transition)
                item.style.transition = "none";
                item.style.transform = `translate3d(${pos.x + dx}px, ${pos.y + dy}px, 0)`;

                // Trigger reflow to apply the style immediately
                void item.offsetHeight;

                // Animate transform to new position
                item.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                item.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
            } else {
                // Directly set transform without animation
                item.style.transition = "none";
                item.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
            }
        });
    }

    /**
     * Handle container resize using RAF to optimize performance
     */
    private handleResize() {
        if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
        this.resizeRaf = requestAnimationFrame(() => {
            this.calculateLayout();
            this.applyLayout(true);
        });
    }

    /**
     * Shuffle items randomly and reapply layout with animation
     */
    public shuffleItems() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
        }

        // Re-append items in new order in DOM
        const fragment = document.createDocumentFragment();
        this.items.forEach((item) => fragment.appendChild(item));
        this.container.appendChild(fragment);

        // Update layout positions and animate
        this.calculateLayout();
        this.applyLayout(true);
    }

    /**
     * Add more items dynamically
     * @param count number of items to add
     */
    public addItems(count: number) {
        const newCount = this.items.length + count;
        this.generateItems(newCount);
        this.calculateLayout();
        this.applyLayout(true);
    }
}
