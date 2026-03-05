import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import type { LayoutMode } from 'masonry-snap-grid-layout';

interface Card {
  id: number;
  title: string;
  body: string;
  height: number;
  color: string;
}

const COLORS = [
  '#fde68a', '#a7f3d0', '#bfdbfe', '#fca5a5',
  '#c4b5fd', '#fdba74', '#6ee7b7', '#93c5fd',
];

function makeCard(i: number): Card {
  return {
    id: i,
    title: `Card ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'.slice(
      0, 20 + (i * 7) % 80,
    ),
    height: 80 + (i * 37) % 180,
    color: COLORS[i % COLORS.length],
  };
}

function cssMasonrySupported(): boolean {
  try { return typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry'); }
  catch { return false; }
}

const INITIAL_COUNT = 200;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; padding: 24px;">
      <h1 style="margin-bottom: 8px; font-size: 1.4rem; color: #333;">
        masonry-snap-grid-layout — Angular Demo
      </h1>

      <!-- Badges -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        <span [style]="badgeStyle(usingCss ? '#059669' : '#4f46e5')">
          Engine: {{ usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry' }}
        </span>
        <span [style]="badgeStyle('#6b7280')">{{ items.length }} items</span>
        <span *ngIf="!cssSupported" [style]="badgeStyle('#9ca3af')">CSS masonry not supported in this browser</span>
      </div>

      <!-- Controls -->
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:24px;padding:16px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <label class="ctrl">
          Layout mode
          <div style="display:flex;gap:4px;">
            <button *ngFor="let m of ['auto','js']"
              (click)="setMode(m)"
              [class.active]="layoutMode === m"
              class="seg-btn">
              {{ m === 'auto' ? 'auto (detect CSS)' : 'js (always JS)' }}
            </button>
          </div>
        </label>

        <label class="ctrl">
          Gutter: {{ gutter }}px
          <input type="range" min="4" max="40" [(ngModel)]="gutter" (ngModelChange)="rebuild()" />
        </label>

        <label class="ctrl">
          Min col: {{ minColWidth }}px
          <input type="range" min="100" max="400" [(ngModel)]="minColWidth" (ngModelChange)="rebuild()" />
        </label>

        <label class="ctrl">
          Animate
          <div style="display:flex;gap:4px;">
            <button (click)="setAnimate(true)"  [class.active]="animate" class="seg-btn">ON</button>
            <button (click)="setAnimate(false)" [class.active]="!animate" class="seg-btn">OFF</button>
          </div>
        </label>

        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-bottom:2px;">
          <button (click)="addItem()"    class="btn btn-add">+ Add</button>
          <button (click)="removeItem()" class="btn btn-remove">− Remove</button>
          <button (click)="resetItems()" class="btn btn-reset">↺ Reset</button>
        </div>
      </div>

      <div #gridContainer></div>
    </div>
  `,
  styles: [`
    .ctrl { display: flex; flex-direction: column; gap: 4px; font-size: .8rem; color: #555; }
    .ctrl input[type=range] { width: 120px; }
    .seg-btn {
      padding: 4px 10px; border: none; border-radius: 6px; cursor: pointer;
      font-size: .75rem; font-weight: 600; background: #e5e7eb; color: #374151;
    }
    .seg-btn.active { background: #4f46e5; color: #fff; }
    .btn { padding: 8px 14px; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: .875rem; }
    .btn:hover { filter: brightness(1.1); }
    .btn-add    { background: #4f46e5; }
    .btn-remove { background: #6b7280; }
    .btn-reset  { background: #9ca3af; }
  `],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLDivElement>;

  gutter      = 16;
  minColWidth = 220;
  layoutMode: LayoutMode = 'auto';
  animate     = true;
  items: Card[] = Array.from({ length: INITIAL_COUNT }, (_, i) => makeCard(i));

  readonly cssSupported = cssMasonrySupported();

  get usingCss() {
    return this.layoutMode === 'auto' && this.cssSupported;
  }

  private nextId = this.items.length;
  private masonry?: MasonrySnapGridLayout<Card>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.rebuild();
  }

  rebuild(): void {
    this.masonry?.destroy();
    this.masonry = new MasonrySnapGridLayout<Card>(
      this.gridContainer.nativeElement,
      {
        layoutMode: this.layoutMode,
        gutter: this.gutter,
        minColWidth: this.minColWidth,
        animate: this.animate,
        items: this.items,
        renderItem: (card) => {
          const el = document.createElement('div');
          el.style.cssText = `
            background:${card.color};border-radius:12px;padding:16px;height:${card.height}px;
            display:flex;flex-direction:column;gap:8px;font-size:.875rem;color:#333;
          `;
          el.innerHTML = `<strong>${card.title}</strong><p style="color:#555;line-height:1.5;margin:0">${card.body}</p>`;
          return el;
        },
      },
    );
    this.cdr.markForCheck();
  }

  setMode(m: string): void {
    this.layoutMode = m as LayoutMode;
    this.rebuild();
  }

  setAnimate(v: boolean): void {
    this.animate = v;
    this.rebuild();
  }

  addItem(): void {
    this.items = [...this.items, makeCard(this.nextId++)];
    this.masonry?.updateItems(this.items);
    this.cdr.markForCheck();
  }

  removeItem(): void {
    this.items = this.items.slice(0, -1);
    this.masonry?.updateItems(this.items);
    this.cdr.markForCheck();
  }

  resetItems(): void {
    this.items  = Array.from({ length: INITIAL_COUNT }, (_, i) => makeCard(i));
    this.nextId = INITIAL_COUNT;
    this.rebuild();
  }

  badgeStyle(bg: string): string {
    return `padding:4px 10px;border-radius:99px;background:${bg};color:#fff;font-size:.75rem;font-weight:600;white-space:nowrap`;
  }

  ngOnDestroy(): void {
    this.masonry?.destroy();
  }
}
