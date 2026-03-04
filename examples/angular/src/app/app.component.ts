import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';

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
      0, 20 + (i * 7) % 80
    ),
    height: 80 + (i * 37) % 180,
    color: COLORS[i % COLORS.length],
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 24px;">
      <h1 style="margin-bottom: 24px; font-size: 1.4rem; color: #333;">
        masonry-snap-grid-layout — Angular Demo
      </h1>

      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 24px;">
        <label style="font-size: .875rem; color: #555;">
          Gutter: {{ gutter }}px
          <input type="range" min="4" max="40" [(ngModel)]="gutter" (ngModelChange)="onOptionsChange()" />
        </label>
        <label style="font-size: .875rem; color: #555;">
          Min col: {{ minColWidth }}px
          <input type="range" min="100" max="400" [(ngModel)]="minColWidth" (ngModelChange)="onOptionsChange()" />
        </label>
        <button (click)="addItem()" class="btn">+ Add item</button>
        <button (click)="removeItem()" class="btn">- Remove item</button>
      </div>

      <div #gridContainer></div>
    </div>
  `,
  styles: [`
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: #fff;
      cursor: pointer;
      font-size: .875rem;
    }
    .btn:hover { background: #4338ca; }
  `],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLDivElement>;

  gutter = 16;
  minColWidth = 220;
  items: Card[] = Array.from({ length: 12 }, (_, i) => makeCard(i));
  private nextId = this.items.length;
  private masonry?: MasonrySnapGridLayout<Card>;

  ngAfterViewInit(): void {
    this.initMasonry();
  }

  private initMasonry(): void {
    this.masonry?.destroy();
    this.masonry = new MasonrySnapGridLayout<Card>(
      this.gridContainer.nativeElement,
      {
        layoutMode: 'js',
        gutter: this.gutter,
        minColWidth: this.minColWidth,
        animate: true,
        items: this.items,
        renderItem: (card) => {
          const el = document.createElement('div');
          el.style.cssText = `
            background: ${card.color};
            border-radius: 12px;
            padding: 16px;
            height: ${card.height}px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: .875rem;
            color: #333;
          `;
          el.innerHTML = `<strong>${card.title}</strong><p style="color:#555;line-height:1.5;margin:0">${card.body}</p>`;
          return el;
        },
      }
    );
  }

  addItem(): void {
    this.items = [...this.items, makeCard(this.nextId++)];
    this.masonry?.updateItems(this.items);
  }

  removeItem(): void {
    this.items = this.items.slice(0, -1);
    this.masonry?.updateItems(this.items);
  }

  onOptionsChange(): void {
    this.initMasonry();
  }

  ngOnDestroy(): void {
    this.masonry?.destroy();
  }
}
