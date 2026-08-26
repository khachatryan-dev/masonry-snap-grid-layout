import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  SimpleChanges,
} from '@angular/core';
import MasonrySnapGridLayout from '../vanilla';
import type {
  ColumnsOption,
  LayoutInfo,
  LayoutMode,
  MasonryOptions,
} from '../core';

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
 *   (layout)="onLayout($event)"
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

  /**
   * Fixed column count, or a mobile-first map of `minContainerWidth -> columns`
   * such as `{ 0: 1, 640: 2, 1024: 3 }`. Overrides `minColWidth` when set.
   */
  @Input() columns?: ColumnsOption;

  /** Enable smooth animations. Default: true */
  @Input() animate = true;

  /** Transition duration in ms. Default: 400 */
  @Input() transitionDuration = 400;

  /**
   * Watch each item for size changes so the layout self-heals when content
   * settles after first measurement — images decoding, fonts swapping,
   * embeds resizing. Default: true
   */
  @Input() observeItemResize = true;

  /** Also listen for image `load`/`error` inside items. Default: true */
  @Input() watchImages = true;

  /** Height assumed for items that measure as zero. */
  @Input() estimatedItemHeight?: number;

  /**
   * Stable identity per item. Supplying it lets the engine reuse DOM nodes
   * across updates instead of rebuilding them, preserving focus, selection,
   * and in-flight media playback.
   */
  @Input() getItemKey?: (item: T, index: number) => string | number;

  /**
   * Function that receives a data item and returns an HTMLElement.
   * Required.
   */
  @Input({ required: true }) renderItem!: MasonryOptions<T>['renderItem'];

  /** Emits after every layout pass. */
  @Output() layout = new EventEmitter<LayoutInfo>();

  @ViewChild('containerRef') private containerRef!: ElementRef<HTMLDivElement>;

  private masonry?: MasonrySnapGridLayout<T>;

  /** Inputs that map straight onto engine options. */
  private static readonly OPTION_INPUTS = [
    'layoutMode',
    'gutter',
    'minColWidth',
    'columns',
    'animate',
    'transitionDuration',
    'observeItemResize',
    'watchImages',
    'estimatedItemHeight',
    'getItemKey',
    'renderItem',
  ] as const;

  ngAfterViewInit(): void {
    this.masonry = new MasonrySnapGridLayout<T>(this.containerRef.nativeElement, {
      items: this.items,
      gutter: this.gutter,
      minColWidth: this.minColWidth,
      columns: this.columns,
      animate: this.animate,
      transitionDuration: this.transitionDuration,
      layoutMode: this.layoutMode,
      observeItemResize: this.observeItemResize,
      watchImages: this.watchImages,
      estimatedItemHeight: this.estimatedItemHeight,
      getItemKey: this.getItemKey,
      renderItem: this.renderItem,
      onLayout: (info) => this.layout.emit(info),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.masonry) return;

    // Previously only `items` was honoured, so binding [gutter] or
    // [minColWidth] to a signal or form control silently did nothing after
    // first render. Forward every option input.
    const optionChanges = MasonrySnapGridComponent.OPTION_INPUTS.filter(
      (name) => changes[name]
    );

    if (optionChanges.length > 0) {
      this.masonry.setOptions({
        layoutMode: this.layoutMode,
        gutter: this.gutter,
        minColWidth: this.minColWidth,
        columns: this.columns,
        animate: this.animate,
        transitionDuration: this.transitionDuration,
        observeItemResize: this.observeItemResize,
        watchImages: this.watchImages,
        estimatedItemHeight: this.estimatedItemHeight,
        getItemKey: this.getItemKey,
        renderItem: this.renderItem,
      });
    }

    if (changes['items']) {
      this.masonry.updateItems(this.items);
    }
  }

  /** Recompute the layout immediately. */
  refresh(): void {
    this.masonry?.refresh();
  }

  ngOnDestroy(): void {
    this.masonry?.destroy();
  }
}
