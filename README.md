
# masonry-snap-grid-layout

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=brightgreen)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![CI/CD](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions/workflows/publish.yml/badge.svg)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)
[![Demo Vanilla JS](https://img.shields.io/badge/demo-vanilla%20js-blue)](https://codesandbox.io/p/sandbox/l9xl7s)
[![Demo React](https://img.shields.io/badge/demo-react-blue)](https://codesandbox.io/p/sandbox/rgxsxp)
[![Angular Core Usage](https://img.shields.io/badge/demo-angular-red)](#angular-service-based-integration)
[![Vue 3 Wrapper](https://img.shields.io/badge/demo-vue%203-green)](#vue-3-wrapper-drop-in-component)

A **performant, SSR-friendly** masonry grid layout library with smooth animations, customizable gutter, columns, and dynamic item content.

---

## ✨ What's New
✅ **Native CSS Masonry (when supported)** — Automatically uses the browser’s CSS masonry implementation for optimal performance.  
✅ **Smart Fallback to JS Engine** — When CSS masonry is not available, a battle-tested JavaScript layout engine kicks in.  
✅ **SSR-Ready Rendering (React)** — On the server, items are rendered as plain HTML so your grid is SEO-friendly and instantly visible.  
✅ **Hydration Takeover** — On the client, the library recalculates and animates the masonry layout after hydration.  
✅ **Zero Dependencies** — Written in TypeScript, works with React and Vanilla JS.  

---

## 📺 Demo Video

[![Watch the video](https://img.youtube.com/vi/mHK_6z9WEWs/hqdefault.jpg)](https://www.youtube.com/watch?v=mHK_6z9WEWs)

---

## 🚀 Features

- **SSR Friendly (React)**: Server renders static layout → client hydrates → masonry positions are recalculated
- **Native CSS Masonry First**: Uses browser CSS masonry when available, falls back to JS when not
- **Dynamic Columns & Gutter**: Adapts automatically to container width
- **Smooth Animations**: CSS-powered transitions when layout changes
- **Customizable Items**: Works with any DOM or React elements
- **Lightweight**: Zero dependencies
- **React & Vue Wrappers, Vanilla JS Core**
- **Responsive**: Great for galleries, dashboards, and card layouts

---

## 🖼 How SSR Works in React Version

```

┌───────────────┐   Server Render Phase
│ Static HTML   │ ← React renders all items normally (SEO-friendly)
└──────┬────────┘
│
▼
┌───────────────┐   Client Hydration Phase
│ Remove static │ ← JavaScript clears SSR content
│ HTML items    │
└──────┬────────┘
│
▼
┌───────────────┐   Masonry Layout Phase
│ Masonry grid  │ ← Library re-renders items and calculates positions
│ with animation│
└───────────────┘

````

---

## 🔧 Installation

```bash
npm install masonry-snap-grid-layout
# or
yarn add masonry-snap-grid-layout
# or
pnpm add masonry-snap-grid-layout
````

---

## 💡 Usage Examples

### Vanilla JavaScript (Live Demo)

```javascript
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/dist/index.css';

const container = document.getElementById('masonry-container');
const items = [
  { id: 1, title: "Sunset", emoji: "🌅", color: "#FF9A9E" },
  { id: 2, title: "Ocean", emoji: "🌊", color: "#A1C4FD" },
];

const masonry = new MasonrySnapGridLayout(container, {
  // Layout engine strategy (optional)
  // 'auto' (default): CSS masonry when supported, JS fallback otherwise
  // 'css'           : Prefer CSS masonry (with JS fallback if not supported)
  // 'js'            : Always use JavaScript engine
  layoutMode: 'auto',
  gutter: 16,
  minColWidth: 200,
  animate: true,
  transitionDuration: 300,
  items,
  renderItem: (item) => {
    const div = document.createElement('div');
    div.style.height = `${120 + Math.random() * 200}px`;
    div.style.background = `linear-gradient(135deg, ${item.color} 0%, #FFFFFF 100%)`;
    div.style.borderRadius = '12px';
    div.style.padding = '16px';
    div.innerHTML = `<div style="font-size: 2rem">${item.emoji}</div>
                     <h3>${item.title}</h3>`;
    return div;
  }
});
```

[![Open Vanilla Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/l9xl7s)

---

### React (SSR-Friendly, Live Demo)

```jsx
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

const items = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  title: `Item ${i + 1}`,
  emoji: ['🌻', '🌈', '🍕', '🎸', '🚀'][Math.floor(Math.random() * 5)],
  height: 120 + Math.random() * 200
}));

export default function Gallery() {
  return (
    <MasonrySnapGrid
      items={items}
      // Optional: control which layout engine to use
      // layoutMode="auto" | "css" | "js"
      gutter={16}
      minColWidth={220}
      animate
      transitionDuration={400}
      renderItem={(item) => (
        <div style={{
          height: `${item.height}px`,
          background: `linear-gradient(135deg, 
            hsl(${Math.random() * 360}, 70%, 70%) 0%, 
            hsl(${Math.random() * 360}, 70%, 80%) 100%)`,
          borderRadius: '12px',
          padding: '16px',
          color: 'white'
        }}>
          <div style={{ fontSize: '2rem' }}>{item.emoji}</div>
          <h3>{item.title}</h3>
        </div>
      )}
    />
  );
}
```

[![Open React Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/rgxsxp)

---

### Angular (Service-Based Integration)

The core library is framework-agnostic and works great inside Angular by using it in a lifecycle hook.

```ts
// gallery.component.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import type { MasonrySnapGridLayoutOptions } from 'masonry-snap-grid-layout';

interface Card {
  id: number;
  title: string;
  color: string;
}

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css'],
})
export class GalleryComponent implements AfterViewInit, OnDestroy {
  @ViewChild('masonryContainer', { static: true })
  containerRef!: ElementRef<HTMLElement>;

  private masonry?: MasonrySnapGridLayout<Card>;

  cards: Card[] = [
    { id: 1, title: 'Card 1', color: '#FF9A9E' },
    { id: 2, title: 'Card 2', color: '#A1C4FD' },
    // ...
  ];

  ngAfterViewInit(): void {
    const container = this.containerRef.nativeElement;

    const options: MasonrySnapGridLayoutOptions<Card> = {
      items: this.cards,
      gutter: 16,
      minColWidth: 220,
      layoutMode: 'auto',
      renderItem: (card) => {
        const el = document.createElement('div');
        el.style.height = `${160 + Math.random() * 160}px`;
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

```html
<!-- gallery.component.html -->
<div #masonryContainer class="masonry-snap-grid-container"></div>
```

---

### Vue 3 Wrapper (Drop-in Component)

Use the official Vue wrapper entry for a React-like experience:

```vue
<template>
  <MasonrySnapGrid :items="items" :gutter="16" :minColWidth="220" layoutMode="auto">
    <template #default="{ item }">
      <div
        :style="{
          height: item.height + 'px',
          borderRadius: '12px',
          padding: '16px',
          color: '#fff',
          background: `linear-gradient(135deg,
            hsl(${item.id * 18}, 70%, 60%) 0%,
            hsl(${item.id * 18 + 40}, 70%, 70%) 100%)`,
        }"
      >
        <h3>{{ item.title }}</h3>
      </div>
    </template>
  </MasonrySnapGrid>
</template>

<script setup lang="ts">
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import { ref } from 'vue';

interface Item {
  id: number;
  title: string;
  height: number;
}

const items = ref<Item[]>(
  Array.from({ length: 20 }, (_, i) => ({
    id: i,
    title: `Item ${i + 1}`,
    height: 120 + Math.random() * 200,
  })),
);
</script>
```

---

## 🛠️ API Reference

| Option               | Type                       | Default | Description                                             |
| -------------------- | -------------------------- | ------- | ------------------------------------------------------- |
| `layoutMode`         | `'auto' \| 'css' \| 'js'`  | `auto`  | Prefer CSS masonry, JS fallback, or force JS/CSS       |
| `gutter`             | `number`                   | `16`    | Spacing between items (px)                              |
| `minColWidth`        | `number`                   | `250`   | Minimum column width (px)                               |
| `animate`            | `boolean`                  | `true`  | Enable/disable animations (JS engine only)              |
| `transitionDuration` | `number`                   | `400`   | Animation duration (ms, JS engine only)                 |
| `items`              | `Array<T>`                 | `[]`    | Your data items                                         |
| `renderItem`         | `(item: T) => HTMLElement` | -       | Function to render each item                            |
| `classNames`         | `Object`                   | -       | Custom CSS class names for container and item elements  |

**Methods**

- `updateItems(newItems: T[])`: Refresh with new items
- `destroy()`: Clean up the instance

---

## 🎨 Customization Tips

* **Gradient Backgrounds**

```css
background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
```

* **Random Emojis**

```js
const emojis = ['🌻', '🌈', '🍕', '🎸', '🚀'];
```

* **Responsive Breakpoints**

```js
minColWidth: window.innerWidth < 768 ? 150 : 250
```

---

## 📦 Package Structure

```
dist/
├── index.js        # Core (vanilla / all frameworks)
├── react.js        # React wrapper (SSR-friendly)
├── vue.js          # Vue 3 wrapper
├── index.d.ts      # Core TypeScript types
├── react.d.ts      # React-specific types
├── vue.d.ts        # Vue-specific types
└── index.css       # Base styles
```

> **Framework usage and dependencies**
>
> - React-specific code lives behind the `masonry-snap-grid-layout/react` entry and declares `react` and `react-dom` as **optional** peer dependencies.
> - Angular and Vue integrations use the **framework-agnostic core** entry (`masonry-snap-grid-layout`), so no React, Angular, or Vue code is bundled unless your app already uses it.

---

## ✅ Testing

This package ships with a small Vitest test suite that covers:

- **Core JS engine**: layout creation, updates, sizing, and destruction.
- **React wrapper**: rendering and basic integration.
- **Angular/Vue-style usage**: lifecycle-style patterns using the core API.

To run tests locally:

```bash
npm install
npm test
```


---

## 🤝 Contributing

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes
4. Push to the branch
5. Open a PR

---

## 📄 License

MIT © [Aram Khachatryan](https://github.com/khachatryan-dev)


