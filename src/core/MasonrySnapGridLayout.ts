import { MasonryOptions } from './types';
import { applyMasonryLayout, removeMasonryLayout } from './layoutEngine';
import { applyCssMasonry, removeCssMasonry } from './cssEngine';
import { supportsCss } from './utils';

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
  private options: Required<MasonryOptions<T>>;
  private elements: HTMLElement[] = [];
  private resizeObserver?: ResizeObserver;
  private usesCss = false;

  constructor(container: HTMLElement, options: MasonryOptions<T>) {
    this.container = container;
    this.options = {
      layoutMode: 'auto',
      gutter: 16,
      minColWidth: 250,
      animate: true,
      transitionDuration: 400,
      ...options,
    };
    this.init();
  }

  private init(): void {
    this.usesCss = this.shouldUseCss();
    this.render();
    this.observeResize();
  }

  private shouldUseCss(): boolean {
    const { layoutMode } = this.options;
    if (layoutMode === 'css') return true;
    if (layoutMode === 'js') return false;
    return supportsCss('grid-template-rows', 'masonry');
  }

  private render(): void {
    this.container.innerHTML = '';
    this.elements = this.options.items.map((item) => this.options.renderItem(item));
    this.elements.forEach((el) => this.container.appendChild(el));
    this.layout();
  }

  private layout(): void {
    const { gutter, minColWidth, animate, transitionDuration } = this.options;

    if (this.usesCss) {
      applyCssMasonry(this.container, gutter, minColWidth);
    } else {
      applyMasonryLayout(
        this.container,
        this.elements,
        minColWidth,
        gutter,
        animate,
        transitionDuration
      );
    }
  }

  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.container);
  }

  /** Replace all items and re-render the grid. */
  updateItems(newItems: T[]): void {
    this.options.items = newItems;
    this.render();
  }

  /** Clean up DOM mutations and stop observing resize. */
  destroy(): void {
    this.resizeObserver?.disconnect();
    if (this.usesCss) {
      removeCssMasonry(this.container);
    } else {
      removeMasonryLayout(this.container, this.elements);
    }
    this.container.innerHTML = '';
    this.elements = [];
  }
}
