import { MasonryOptions } from './types';
import { applyMasonryLayout } from './layoutEngine';
import { applyCssMasonry } from './cssEngine';

export default class MasonrySnapGridLayout<T> {
  private container: HTMLElement;
  private options: Required<MasonryOptions<T>>;
  private elements: HTMLElement[] = [];
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement, options: MasonryOptions<T>) {
    this.container = container;
    this.options = {
      layoutMode: 'auto',
      gutter: 16,
      minColWidth: 250,
      animate: true,
      transitionDuration: 400,
      ...options
    };
    this.init();
  }

  private init() {
    this.render();
    this.observeResize();
  }

  private render() {
    this.container.innerHTML = '';
    this.elements = this.options.items.map(item => this.options.renderItem(item));
    this.elements.forEach(el => this.container.appendChild(el));
    this.layout();
  }

  private layout() {
    const { layoutMode, gutter, minColWidth, animate, transitionDuration } = this.options;
    const supportsCssMasonry = typeof CSS !== 'undefined' && (CSS as any)?.supports?.('grid-template-rows', 'masonry');

    if (layoutMode === 'css' || (layoutMode === 'auto' && supportsCssMasonry)) {
      applyCssMasonry(this.container, gutter, minColWidth);
    } else {
      applyMasonryLayout(this.container, this.elements, minColWidth, gutter, animate, transitionDuration);
    }
  }

  updateItems(newItems: T[]) {
    this.options.items = newItems;
    this.render();
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.container.innerHTML = '';
  }

  private observeResize() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.container);
  }
}