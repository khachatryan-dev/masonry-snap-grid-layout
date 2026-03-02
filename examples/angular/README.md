## Angular example

This repository does not contain a full generated Angular project, because
Angular apps are typically large and tightly coupled to a specific CLI and
compiler version.

Instead, follow these steps to try `masonry-snap-grid-layout` in Angular:

### 1. Create an Angular app

```bash
npm install -g @angular/cli
ng new masonry-grid-angular-demo --routing=false --style=css
cd masonry-grid-angular-demo
```

### 2. Install the library

```bash
npm install masonry-snap-grid-layout
```

### 3. Add global styles

In `src/styles.css`:

```css
@import 'masonry-snap-grid-layout/dist/index.css';
```

### 4. Use the core layout in a component

In `src/app/app.component.html`:

```html
<div #masonryContainer class="masonry-snap-grid-container"></div>
```

In `src/app/app.component.ts`:

```ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import type { MasonrySnapGridLayoutOptions } from 'masonry-snap-grid-layout';

interface Card {
  id: number;
  title: string;
  color: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('masonryContainer', { static: true })
  containerRef!: ElementRef<HTMLElement>;

  private masonry?: MasonrySnapGridLayout<Card>;

  cards: Card[] = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    title: `Card ${i + 1}`,
    color: `hsl(${i * 18}, 80%, 60%)`,
  }));

  ngAfterViewInit(): void {
    const container = this.containerRef.nativeElement;

    const options: MasonrySnapGridLayoutOptions<Card> = {
      items: this.cards,
      gutter: 16,
      minColWidth: 220,
      layoutMode: 'auto',
      renderItem: (card) => {
        const el = document.createElement('div');
        el.style.height = `${140 + Math.random() * 160}px`;
        el.style.background = card.color;
        el.style.borderRadius = '12px';
        el.style.padding = '16px';
        el.style.color = '#fff';
        el.innerHTML = `<h3>${card.title}</h3>`;
        return el;
      },
    };

    this.masonry = new MasonrySnapGridLayout(container, options);
  }

  ngOnDestroy(): void {
    this.masonry?.destroy();
  }
}
```

### 5. Run the Angular app

```bash
ng serve
```

Visit the URL Angular CLI prints (typically `http://localhost:4200`) to see the
grid running in Angular.

