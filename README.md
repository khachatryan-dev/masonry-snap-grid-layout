<div align="center">

# masonry-snap-grid-layout

**A performant, SSR-friendly masonry grid for Vanilla JS, React, Vue 3, and Angular**

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/khachatryan-dev/masonry-snap-grid-layout/publish.yml?style=flat-square&labelColor=1e1b4b&color=6366f1&label=CI%2FCD)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-6366f1?style=flat-square&labelColor=1e1b4b)](./LICENSE)
[![Zero deps](https://img.shields.io/badge/dependencies-0-6366f1?style=flat-square&labelColor=1e1b4b)](./package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-6366f1?style=flat-square&labelColor=1e1b4b&logo=typescript&logoColor=white)](./tsconfig.json)

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=000)](https://buymeacoffee.com/arkhachats)

<br/>

[![Vanilla JS Demo](https://img.shields.io/badge/▶%20Vanilla%20JS-demo-f7df1e?style=for-the-badge)](https://codesandbox.io/p/sandbox/l9xl7s)
[![React Demo](https://img.shields.io/badge/▶%20React-demo-61dafb?style=for-the-badge)](https://codesandbox.io/p/sandbox/rgxsxp)
[![Vue 3 Demo](https://img.shields.io/badge/▶%20Vue%203-demo-42b883?style=for-the-badge)](#)
[![Angular Demo](https://img.shields.io/badge/▶%20Angular-demo-dd0031?style=for-the-badge)](#)

</div>

---

## Overview

`masonry-snap-grid-layout` is a **zero-dependency**, **TypeScript-first** masonry layout engine that works across every major framework. It uses **native CSS masonry** when the browser supports it, and falls back to a smooth JS engine otherwise — giving you the best of both worlds without any configuration.

```
┌─────────┐  ┌─────────────┐  ┌──────┐
│ Card 1  │  │   Card 2    │  │ Card │
│         │  │   (tall)    │  │  3   │
└─────────┘  │             │  └──────┘
┌──────────┐ │             │  ┌────────────┐
│  Card 4  │ └─────────────┘  │   Card 5   │
│  (tall)  │  ┌──────────┐   │            │
│          │  │  Card 6  │   └────────────┘
└──────────┘  └──────────┘
```

---

## ✨ Features

| | Feature | Detail |
|---|---|---|
| 🎨 | **CSS-First Engine** | Uses native `grid-template-rows: masonry` when available |
| ⚙️ | **JS Fallback Engine** | Rock-solid JS layout for all other browsers |
| 🖥️ | **SSR Ready** | Server renders static HTML — no layout shift, SEO-friendly |
| ⚡ | **Zero Dependencies** | Nothing to audit, nothing to update |
| 🔷 | **TypeScript-First** | Fully typed generics for your data items |
| 🎬 | **Smooth Animations** | CSS `transform` transitions on layout changes |
| 📐 | **Responsive** | Recalculates columns automatically via `ResizeObserver` |
| 🧩 | **Multi-Framework** | Vanilla JS · React · Vue 3 · Angular |

---

## 📦 Installation

```bash
# npm
npm install masonry-snap-grid-layout

# yarn
yarn add masonry-snap-grid-layout

# pnpm
pnpm add masonry-snap-grid-layout
```

---

## 🚀 Quick Start

### Vanilla JS

```js
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

const masonry = new MasonrySnapGridLayout(container, {
  layoutMode: 'auto',   // 'auto' | 'css' | 'js'
  gutter: 16,
  minColWidth: 240,
  animate: true,
  items,
  renderItem: (item) => {
    const el = document.createElement('div');
    el.style.height = item.height + 'px';
    el.style.background = `linear-gradient(135deg, ${item.color}, #fff)`;
    el.textContent = item.title;
    return el;
  },
});

// Later:
masonry.updateItems(newItems);
masonry.destroy();
```

---

### ⚛️ React

SSR-safe — works with Next.js App Router, Pages Router, and plain Vite.

```tsx
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/style.css';

export default function Gallery({ items }) {
  return (
    <MasonrySnapGrid
      items={items}
      layoutMode="auto"
      gutter={16}
      minColWidth={240}
      animate
      renderItem={(item) => (
        <div style={{ height: item.height, borderRadius: 12, padding: 16 }}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>
      )}
    />
  );
}
```

**Next.js App Router** — add `'use client'` since the component uses browser APIs after hydration:

```tsx
'use client';

import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/style.css';
```

**How SSR works:**
1. Server renders items in a responsive CSS grid → visible HTML for crawlers
2. Browser receives full HTML immediately → fast FCP
3. Client hydrates, measures heights, applies masonry transforms
4. `ResizeObserver` keeps layout correct on window resize

---

### 💚 Vue 3

Drop-in component with a typed scoped slot — no render functions needed.

```vue
<script setup lang="ts">
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import 'masonry-snap-grid-layout/style.css';
</script>

<template>
  <MasonrySnapGrid
    :items="items"
    :gutter="16"
    :min-col-width="240"
    :animate="true"
  >
    <template #default="{ item }">
      <div
        :style="{
          height: item.height + 'px',
          borderRadius: '12px',
          padding: '16px',
        }"
      >
        <h3>{{ item.title }}</h3>
        <p>{{ item.body }}</p>
      </div>
    </template>
  </MasonrySnapGrid>
</template>
```

---

### 🔴 Angular

Standalone component — works with Angular 17+ and the default Ivy compiler.

```typescript
// app.component.ts
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';

@Component({ selector: 'app-root', standalone: true, template: `<div #grid></div>` })
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('grid') gridRef!: ElementRef<HTMLDivElement>;
  private masonry?: MasonrySnapGridLayout<Item>;

  ngAfterViewInit() {
    this.masonry = new MasonrySnapGridLayout(this.gridRef.nativeElement, {
      items: this.items,
      gutter: 16,
      minColWidth: 240,
      animate: true,
      renderItem: (item) => {
        const el = document.createElement('div');
        el.style.height = item.height + 'px';
        el.textContent = item.title;
        return el;
      },
    });
  }

  ngOnDestroy() { this.masonry?.destroy(); }
}
```

Import the stylesheet in `src/styles.css`:

```css
@import 'masonry-snap-grid-layout/style.css';
```

---

## 🧩 API Reference

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `T[]` | **required** | Array of data items to render |
| `renderItem` | `(item: T) => HTMLElement` | **required** | Returns the DOM element for each item |
| `layoutMode` | `'auto' \| 'css' \| 'js'` | `'auto'` | `auto` uses CSS masonry if supported, else JS |
| `gutter` | `number` | `16` | Gap between items in pixels |
| `minColWidth` | `number` | `250` | Minimum column width in pixels |
| `animate` | `boolean` | `true` | Smooth CSS transform transitions |
| `transitionDuration` | `number` | `400` | Transition length in ms (JS mode) |

### Methods (Vanilla JS)

```ts
masonry.updateItems(newItems: T[])  // Swap items and re-layout
masonry.destroy()                   // Remove layout styles and stop observing
```

### React Props

All options above apply, plus:

| Prop | Type | Description |
|------|------|-------------|
| `renderItem` | `(item: T) => ReactNode` | JSX render function (not HTMLElement) |
| `className` | `string` | Extra class on the container |
| `style` | `CSSProperties` | Extra inline styles on the container |

### Vue Props & Slots

All options apply as kebab-case props (`:gutter`, `:min-col-width`, etc.)

| Slot | Slot props | Description |
|------|-----------|-------------|
| `#default` | `{ item: T, index: number }` | Renders each card's content |

---

## ⚡ Engine Comparison

| | CSS Masonry | JS Masonry |
|---|---|---|
| **Availability** | Firefox (flag) + Chrome 135+ | All browsers |
| **Animations** | Limited | ✅ Smooth `transform` |
| **SSR Support** | ✅ | ✅ |
| **Performance** | ⚡ Native | ⚡ Transform-based |
| **Column control** | Browser decides | Exact `minColWidth` |

> `layoutMode: 'auto'` picks CSS masonry when `CSS.supports('grid-template-rows', 'masonry')` is true, and falls back to JS automatically.

---

## 🖥️ Running Examples Locally

> **First** — build the library so examples can import from `dist/`:
> ```bash
> npm run build
> ```

| Framework | Command | URL |
|-----------|---------|-----|
| **Vanilla JS** | `cd examples/vanilla && npx serve .` | http://localhost:3000 |
| **React** | `cd examples/react && npm install && npm run dev` | http://localhost:5173 |
| **Vue 3** | `cd examples/vue && npm install && npm run dev` | http://localhost:5173 |
| **Angular** | `cd examples/angular && npm install && npm run dev` | http://localhost:4200 |

Each example features live sliders for gutter / column width and add/remove buttons for dynamic updates.

---

## 🧪 Testing

```bash
npm test
```

Tests are written with **Vitest** and cover:

- Column count algorithm (including zero-width containers)
- JS masonry layout engine — positioning, heights, animations
- CSS masonry engine — grid property output
- `MasonrySnapGridLayout` class — full lifecycle (`init`, `updateItems`, `destroy`, `ResizeObserver`)
- React component — SSR class, layout modes, item updates, ResizeObserver teardown

---

## 📈 Performance Notes

- **No DOM thrashing** — item widths are set in one batch, heights read in one pass, transforms applied last
- **`ResizeObserver`** — efficient, debounce-free responsive layout
- **`will-change: transform`** — GPU-composited animations on layout items
- **Tree-shakeable** — import only what you use (`/react`, `/vue`, `/angular`)

---

## 🤝 Contributing

```bash
git clone https://github.com/khachatryan-dev/masonry-snap-grid-layout
cd masonry-snap-grid-layout
npm install
npm test        # run tests
npm run build   # build dist/
```

1. Fork → feature branch → PR
2. All PRs should keep `npm test` green

---

## 👤 Author

Built and maintained by **Aram Khachatryan**

[![GitHub](https://img.shields.io/badge/GitHub-khachatryan--dev-181717?style=flat-square&logo=github)](https://github.com/khachatryan-dev)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=000)](https://buymeacoffee.com/arkhachats)

---

## 📄 License

MIT © [Aram Khachatryan](https://github.com/khachatryan-dev)
