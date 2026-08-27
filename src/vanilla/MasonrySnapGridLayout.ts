import {
  applyCssMasonry,
  applyMasonryLayout,
  createItemObserver,
  createScheduler,
  removeCssMasonry,
  removeMasonryLayout,
  resolveColumnCount,
  supportsCss,
  type ItemObserver,
  type LayoutInfo,
  type MasonryOptions,
  type Scheduler,
} from '../core';

/** Every option with its default filled in. */
type ResolvedOptions<T> = MasonryOptions<T> & {
  layoutMode: NonNullable<MasonryOptions<T>['layoutMode']>;
  gutter: number;
  minColWidth: number;
  animate: boolean;
  transitionDuration: number;
  observeItemResize: boolean;
  watchImages: boolean;
};

/**
 * Vanilla JS masonry grid layout engine.
 *
 * @example
 * const masonry = new MasonrySnapGridLayout(container, {
 *   layoutMode: 'auto',
 *   gutter: 16,
 *   minColWidth: 240,
 *   animate: true,
 *   items,
 *   renderItem: (item) => {
 *     const el = document.createElement('div');
 *     el.textContent = item.title;
 *     return el;
 *   },
 * });
 */
export default class MasonrySnapGridLayout<T> {
  private container: HTMLElement;
  private options: ResolvedOptions<T>;
  private elements: HTMLElement[] = [];
  private resizeObserver?: ResizeObserver;
  private itemObserver?: ItemObserver;
  private scheduler: Scheduler;
  private usesCss = false;
  private destroyed = false;

  /** Element cache keyed by `getItemKey`, enabling reuse across updates. */
  private keyed = new Map<string | number, HTMLElement>();

  constructor(container: HTMLElement, options: MasonryOptions<T>) {
    this.container = container;
    this.options = {
      layoutMode: 'auto',
      gutter: 16,
      minColWidth: 250,
      animate: true,
      transitionDuration: 400,
      observeItemResize: true,
      watchImages: true,
      ...options,
    };
    this.scheduler = createScheduler(() => this.layout());
    this.init();
  }

  private init(): void {
    this.usesCss = this.shouldUseCss();

    if (!this.usesCss && this.options.observeItemResize) {
      this.itemObserver = createItemObserver({
        onChange: () => this.layout(),
        watchImages: this.options.watchImages,
      });
    }

    this.render();
    this.observeResize();
  }

  private shouldUseCss(): boolean {
    if (this.options.layoutMode === 'js') return false;
    // 'auto' (default): use CSS masonry only when the browser natively supports it
    return supportsCss('grid-template-rows', 'masonry');
  }

  /**
   * Build the element list for the current items.
   *
   * With `getItemKey` supplied, elements are reused across updates instead of
   * being torn down and rebuilt — preserving focus, text selection, scroll
   * position inside items, and in-flight media playback. Without it, indices
   * carry no identity so a full rebuild is the only correct option.
   */
  private buildElements(): HTMLElement[] {
    const { items, renderItem, getItemKey } = this.options;

    if (!getItemKey) {
      this.keyed.clear();
      return items.map((item, i) => renderItem(item, i));
    }

    const next = new Map<string | number, HTMLElement>();
    const elements = items.map((item, i) => {
      const key = getItemKey(item, i);
      const existing = this.keyed.get(key);
      const el = existing ?? renderItem(item, i);
      next.set(key, el);
      return el;
    });

    // Detach elements whose keys are gone.
    this.keyed.forEach((el, key) => {
      if (!next.has(key)) {
        this.itemObserver?.unobserve(el);
        el.remove();
      }
    });

    this.keyed = next;
    return elements;
  }

  /**
   * Detach elements from the item observer.
   *
   * Removing a node from the DOM does not stop a ResizeObserver watching it, so
   * skipping this would make the observer's set grow with every update.
   */
  private releaseElements(elements: HTMLElement[]): void {
    if (!this.itemObserver) return;
    elements.forEach((el) => this.itemObserver?.unobserve(el));
  }

  /** Unobserve and remove every current element, resetting the key cache. */
  private discardElements(): void {
    this.elements.forEach((el) => {
      this.itemObserver?.unobserve(el);
      el.remove();
    });
    this.elements = [];
    this.keyed.clear();
  }

  private render(): void {
    if (!this.options.getItemKey) {
      // Without keys there is no identity to reconcile against, so every node
      // is rebuilt. Release the outgoing ones before they are dropped.
      this.releaseElements(this.elements);
      this.container.innerHTML = '';
    }

    const nextElements = this.buildElements();

    // Appending in item order is a no-op for nodes already correctly placed,
    // and moves the rest into position.
    nextElements.forEach((el) => this.container.appendChild(el));

    this.elements = nextElements;

    if (this.itemObserver) {
      this.elements.forEach((el) => this.itemObserver?.observe(el));
    }

    this.layout();
  }

  private layout(): void {
    if (this.destroyed) return;

    const {
      gutter,
      minColWidth,
      animate,
      transitionDuration,
      columns,
      estimatedItemHeight,
      onLayout,
    } = this.options;

    if (this.usesCss) {
      applyCssMasonry(this.container, gutter, minColWidth, columns);
      if (onLayout) {
        const width = this.container.clientWidth;
        const columnCount = resolveColumnCount(width, {
          columns,
          minColWidth,
          gutter,
        });
        onLayout({
          columnCount,
          columnWidth: (width - gutter * (columnCount - 1)) / columnCount,
          containerHeight: this.container.clientHeight,
          itemCount: this.elements.length,
          engine: 'css',
        });
      }
      return;
    }

    const result = applyMasonryLayout(
      this.container,
      this.elements,
      minColWidth,
      gutter,
      animate,
      transitionDuration,
      { columns, estimatedItemHeight }
    );

    if (result && onLayout) {
      const info: LayoutInfo = {
        columnCount: result.columnCount,
        columnWidth: result.columnWidth,
        containerHeight: result.containerHeight,
        itemCount: this.elements.length,
        engine: 'js',
      };
      onLayout(info);
    }
  }

  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    // Coalesced so a drag-resize does not run one layout per observer callback.
    this.resizeObserver = new ResizeObserver(() => this.scheduler.schedule());
    this.resizeObserver.observe(this.container);
  }

  /** Replace all items and re-render the grid. */
  updateItems(newItems: T[]): void {
    this.options.items = newItems;
    this.render();
  }

  /**
   * Merge in new options and re-layout.
   *
   * Changing `layoutMode` re-evaluates which engine is used and cleans up the
   * previous engine's styles before switching, so callers never have to
   * destroy and rebuild the instance to change a single option.
   */
  setOptions(next: Partial<Omit<MasonryOptions<T>, 'items'>>): void {
    const prevMode = this.options.layoutMode;
    const prevRenderItem = this.options.renderItem;

    this.options = { ...this.options, ...next };

    const modeChanged =
      next.layoutMode !== undefined && next.layoutMode !== prevMode;
    const rendererChanged =
      next.renderItem !== undefined && next.renderItem !== prevRenderItem;

    if (modeChanged) {
      const wasCss = this.usesCss;
      const nowCss = this.shouldUseCss();

      if (wasCss !== nowCss) {
        // Strip the outgoing engine's inline styles before the incoming one
        // writes its own, or leftovers from either would fight the other.
        if (wasCss) removeCssMasonry(this.container);
        else removeMasonryLayout(this.container, this.elements);
        this.usesCss = nowCss;
      }
    }

    if (rendererChanged) {
      // Every element must be rebuilt by the new renderer. Discard the old
      // ones explicitly — clearing the key cache alone would strand them in
      // the DOM, because the reconcile pass would have nothing to remove.
      this.discardElements();
      this.render();
      return;
    }

    this.layout();
  }

  /**
   * Recompute the layout immediately.
   *
   * Rarely needed — item resizes, image loads, and container resizes are all
   * detected automatically — but useful after mutating item content directly.
   */
  refresh(): void {
    this.layout();
  }

  /** Clean up DOM mutations and stop observing resize. */
  destroy(): void {
    this.destroyed = true;
    this.scheduler.cancel();
    this.resizeObserver?.disconnect();
    this.itemObserver?.disconnect();
    if (this.usesCss) {
      removeCssMasonry(this.container);
    } else {
      removeMasonryLayout(this.container, this.elements);
    }
    this.container.innerHTML = '';
    this.elements = [];
    this.keyed.clear();
  }
}
