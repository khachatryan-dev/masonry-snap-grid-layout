import {
  Component,
  Input,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  SimpleChanges,
} from '@angular/core';
import MasonrySnapGridLayout from '../core/MasonrySnapGridLayout';
import type { LayoutMode, MasonryOptions } from '../core/types';

/**
 * Angular standalone component for masonry-snap-grid-layout.
 *
 * Usage:
 * ```html
 * <masonry-snap-grid
 *   [items]="items"
 *   [gutter]="16"
 *   [minColWidth]="240"
 *   [renderItem]="renderFn"
 * />
 * ```
 *
 * @example
 * // In your component:
 * renderFn = (item: MyItem): HTMLElement => {
 *   const el = document.createElement('div');
 *   el.style.height = item.height + 'px';
 *   el.textContent = item.title;
 *   return el;
 * };
 */
@Component({
  selector: 'masonry-snap-grid',
  standalone: true,
  template: `<div #containerRef></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class MasonrySnapGridComponent<T = unknown>
  implements AfterViewInit, OnChanges, OnDestroy
{
  /** Array of data items to render. */
  @Input({ required: true }) items: T[] = [];

  /** Engine strategy. Default: 'auto' */
  @Input() layoutMode: LayoutMode = 'auto';

  /** Space between items in pixels. Default: 16 */
  @Input() gutter = 16;

  /** Minimum column width in pixels. Default: 250 */
  @Input() minColWidth = 250;

  /** Enable smooth animations. Default: true */
  @Input() animate = true;

  /** Transition duration in ms. Default: 400 */
  @Input() transitionDuration = 400;

  /**
   * Function that receives a data item and returns an HTMLElement.
   * Required.
   */
  @Input({ required: true }) renderItem!: MasonryOptions<T>['renderItem'];

  @ViewChild('containerRef') private containerRef!: ElementRef<HTMLDivElement>;

  private masonry?: MasonrySnapGridLayout<T>;

  ngAfterViewInit(): void {
    this.masonry = new MasonrySnapGridLayout<T>(
      this.containerRef.nativeElement,
      {
        items: this.items,
        gutter: this.gutter,
        minColWidth: this.minColWidth,
        animate: this.animate,
        transitionDuration: this.transitionDuration,
        layoutMode: this.layoutMode,
        renderItem: this.renderItem,
      }
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.masonry) return;
    if (changes['items']) {
      this.masonry.updateItems(this.items);
    }
  }

  ngOnDestroy(): void {
    this.masonry?.destroy();
  }
}
