import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasonrySnapGridComponent } from 'masonry-snap-grid-layout/angular';
import type {
  ColumnsOption,
  LayoutInfo,
  LayoutMode,
} from 'masonry-snap-grid-layout';

interface Card {
  id: number;
  title: string;
  body: string;
  height: number;
  color: string;
}

type ColumnMode = 'minWidth' | 'fixed' | 'responsive';
type Content = 'text' | 'images';

const COLORS = [
  '#fde68a',
  '#a7f3d0',
  '#bfdbfe',
  '#fca5a5',
  '#c4b5fd',
  '#fdba74',
  '#6ee7b7',
  '#93c5fd',
];

function makeCard(i: number): Card {
  return {
    id: i,
    title: `Card ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'.slice(
      0,
      20 + ((i * 7) % 80)
    ),
    height: 80 + ((i * 37) % 180),
    color: COLORS[i % COLORS.length],
  };
}

function cssMasonrySupported(): boolean {
  try {
    return (
      typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry')
    );
  } catch {
    return false;
  }
}

const INITIAL_COUNT = 200;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MasonrySnapGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      style="font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; padding: 24px;"
    >
      <h1 style="margin-bottom: 8px; font-size: 1.4rem; color: #333;">
        masonry-snap-grid-layout — Angular Demo
      </h1>

      <!-- Badges -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        <span [style]="badgeStyle(usingCss ? '#059669' : '#4f46e5')">
          Engine: {{ usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry' }}
        </span>
        <span [style]="badgeStyle('#6b7280')">{{ items.length }} items</span>
        <span [style]="badgeStyle('#374151')">{{ columnSummary }}</span>
        <span *ngIf="layout" [style]="badgeStyle('#0f766e')">
          {{ layout!.columnCount }} cols × {{ round(layout!.columnWidth) }}px ·
          {{ round(layout!.containerHeight) }}px tall
        </span>
        <span *ngIf="content === 'images'" [style]="badgeStyle('#be185d')">
          🖼 Images with no width/height — watch it self-heal
        </span>
        <span [style]="badgeStyle('#9ca3af')">
          Virtualization is React/Vue only
        </span>
        <span *ngIf="!cssSupported" [style]="badgeStyle('#9ca3af')"
          >CSS masonry not supported in this browser</span
        >
      </div>

      <!-- Controls -->
      <div
        style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:24px;padding:16px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);"
      >
        <label class="ctrl">
          Layout mode
          <div style="display:flex;gap:4px;">
            <button
              *ngFor="let m of ['auto', 'js']"
              (click)="layoutMode = asMode(m)"
              [class.active]="layoutMode === m"
              class="seg-btn"
            >
              {{ m }}
            </button>
          </div>
        </label>

        <label class="ctrl">
          Content
          <div style="display:flex;gap:4px;">
            <button
              *ngFor="let c of ['text', 'images']"
              (click)="content = asContent(c)"
              [class.active]="content === c"
              class="seg-btn"
            >
              {{ c }}
            </button>
          </div>
        </label>

        <label class="ctrl">
          Columns
          <div style="display:flex;gap:4px;">
            <button
              *ngFor="let m of columnModes"
              (click)="columnMode = m.value"
              [class.active]="columnMode === m.value"
              class="seg-btn"
            >
              {{ m.label }}
            </button>
          </div>
        </label>

        <label class="ctrl" *ngIf="columnMode === 'fixed'">
          Fixed columns: {{ fixedColumns }}
          <input type="range" min="1" max="6" [(ngModel)]="fixedColumns" />
        </label>

        <label class="ctrl" *ngIf="columnMode === 'minWidth'">
          Min col: {{ minColWidth }}px
          <input type="range" min="100" max="400" [(ngModel)]="minColWidth" />
        </label>

        <label class="ctrl">
          Gutter: {{ gutter }}px
          <input type="range" min="0" max="40" [(ngModel)]="gutter" />
        </label>

        <label class="ctrl">
          Animate
          <div style="display:flex;gap:4px;">
            <button
              (click)="animate = true"
              [class.active]="animate"
              class="seg-btn"
            >
              ON
            </button>
            <button
              (click)="animate = false"
              [class.active]="!animate"
              class="seg-btn"
            >
              OFF
            </button>
          </div>
        </label>

        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-bottom:2px;">
          <button (click)="addItem()" class="btn btn-add">+ Append</button>
          <button (click)="prependItem()" class="btn btn-prepend">↑ Prepend</button>
          <button (click)="shuffleItems()" class="btn btn-shuffle">
            ⇄ Shuffle
          </button>
          <button (click)="removeItem()" class="btn btn-remove">− Remove</button>
          <button (click)="resetItems()" class="btn btn-reset">↺ Reset</button>
        </div>
      </div>

      <p style="font-size:.8rem;color:#666;margin:0 0 16px;">
        Every control below is a plain <code>&#64;Input</code> binding — no manual
        rebuild. <strong>Prepend</strong> and <strong>Shuffle</strong> demonstrate
        <code>getItemKey</code>: existing elements are reused rather than rebuilt,
        so cards keep their identity. Switch <strong>Content</strong> to
        <em>images</em> to watch the grid re-pack itself as each image decodes.
      </p>

      <masonry-snap-grid
        [items]="items"
        [layoutMode]="layoutMode"
        [gutter]="gutter"
        [minColWidth]="minColWidth"
        [columns]="columns"
        [animate]="animate"
        [getItemKey]="trackById"
        [renderItem]="renderItem"
        (layout)="onLayout($event)"
      ></masonry-snap-grid>
    </div>
  `,
  styles: [
    `
      .ctrl {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.8rem;
        color: #555;
        white-space: nowrap;
      }
      .ctrl input[type='range'] {
        width: 120px;
      }
      .seg-btn {
        padding: 4px 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        background: #e5e7eb;
        color: #374151;
      }
      .seg-btn.active {
        background: #4f46e5;
        color: #fff;
      }
      .btn {
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        color: #fff;
        cursor: pointer;
        font-size: 0.875rem;
      }
      .btn:hover {
        filter: brightness(1.1);
      }
      .btn-add {
        background: #4f46e5;
      }
      .btn-prepend {
        background: #0f766e;
      }
      .btn-shuffle {
        background: #7c3aed;
      }
      .btn-remove {
        background: #6b7280;
      }
      .btn-reset {
        background: #9ca3af;
      }
    `,
  ],
})
export class AppComponent {
  gutter = 16;
  minColWidth = 220;
  fixedColumns = 3;
  columnMode: ColumnMode = 'minWidth';
  layoutMode: LayoutMode = 'auto';
  animate = true;
  content: Content = 'text';
  layout: LayoutInfo | null = null;
  items: Card[] = Array.from({ length: INITIAL_COUNT }, (_, i) => makeCard(i));

  readonly cssSupported = cssMasonrySupported();
  readonly columnModes: { value: ColumnMode; label: string }[] = [
    { value: 'minWidth', label: 'min width' },
    { value: 'fixed', label: 'fixed' },
    { value: 'responsive', label: 'breakpoints' },
  ];

  /**
   * Held as a readonly field, not built inline in the getter. Returning a fresh
   * object on every change-detection pass would make Angular see a new input
   * value each cycle and relayout endlessly.
   */
  private readonly responsiveColumns: ColumnsOption = {
    0: 1,
    520: 2,
    900: 3,
    1280: 4,
    1600: 5,
  };

  private nextId = INITIAL_COUNT;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  get usingCss(): boolean {
    return this.layoutMode === 'auto' && this.cssSupported;
  }

  /** Undefined means "derive the count from minColWidth". */
  get columns(): ColumnsOption | undefined {
    if (this.columnMode === 'fixed') return this.fixedColumns;
    if (this.columnMode === 'responsive') return this.responsiveColumns;
    return undefined;
  }

  get columnSummary(): string {
    if (this.columnMode === 'fixed') return `[columns]="${this.fixedColumns}"`;
    if (this.columnMode === 'responsive')
      return '[columns]="{ 0:1, 520:2, 900:3, … }"';
    return `[minColWidth]="${this.minColWidth}"`;
  }

  /**
   * Two stable renderers, swapped by reference. A single renderer reading
   * `this.content` would never change identity, so Angular would not see a new
   * input and the grid would keep the old markup.
   */
  get renderItem(): (card: Card, index: number) => HTMLElement {
    return this.content === 'images' ? this.renderImage : this.renderText;
  }

  trackById = (card: Card): number => card.id;

  private renderText = (card: Card): HTMLElement => {
    const el = document.createElement('div');
    el.style.cssText = `background:${card.color};border-radius:12px;padding:16px;height:${card.height}px;display:flex;flex-direction:column;gap:8px;font-size:.875rem;color:#333;`;
    const title = document.createElement('strong');
    title.textContent = card.title;
    const body = document.createElement('p');
    body.style.cssText = 'color:#555;line-height:1.5;margin:0';
    body.textContent = card.body;
    el.append(title, body);
    return el;
  };

  private renderImage = (card: Card, index: number): HTMLElement => {
    // Deliberately no width/height attributes: the browser cannot reserve
    // space, so the first measurement happens against a zero-height image.
    // Self-healing is what corrects the layout once each one decodes.
    const h = 140 + ((card.id * 53) % 220);
    const figure = document.createElement('figure');
    figure.style.cssText =
      'margin:0;border-radius:12px;overflow:hidden;background:#e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.10)';
    const img = document.createElement('img');
    img.src = `https://picsum.photos/seed/msgl-${card.id}/400/${h}`;
    img.alt = `Placeholder ${card.id}`;
    img.style.cssText = 'width:100%;height:auto;display:block';
    const caption = document.createElement('figcaption');
    caption.style.cssText = 'padding:8px 12px;font-size:.75rem;color:#555';
    caption.textContent = `#${index} · ${card.title}`;
    figure.append(img, caption);
    return figure;
  };

  /**
   * The engine reports layout from observers that run outside Angular's zone,
   * so re-enter it before marking the view dirty.
   */
  onLayout(info: LayoutInfo): void {
    this.zone.run(() => {
      this.layout = info;
      this.cdr.markForCheck();
    });
  }

  addItem(): void {
    this.items = [...this.items, makeCard(this.nextId++)];
  }

  prependItem(): void {
    this.items = [makeCard(this.nextId++), ...this.items];
  }

  shuffleItems(): void {
    const next = [...this.items];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    this.items = next;
  }

  removeItem(): void {
    this.items = this.items.slice(0, -1);
  }

  resetItems(): void {
    this.items = Array.from({ length: INITIAL_COUNT }, (_, i) => makeCard(i));
    this.nextId = INITIAL_COUNT;
  }

  asMode(value: string): LayoutMode {
    return value as LayoutMode;
  }

  asContent(value: string): Content {
    return value as Content;
  }

  round(value: number): number {
    return Math.round(value);
  }

  badgeStyle(bg: string): string {
    return `padding:4px 10px;border-radius:99px;background:${bg};color:#fff;font-size:.75rem;font-weight:600;white-space:nowrap`;
  }
}
