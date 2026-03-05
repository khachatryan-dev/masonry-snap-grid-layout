<div align="center">

# masonry-snap-grid-layout

**A performant, SSR-friendly masonry grid for Vanilla JS, React, Vue 3, and Angular**

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![npm downloads](https://img.shields.io/npm/dm/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![bundle size](https://img.shields.io/bundlephobia/minzip/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square&label=minzipped)](https://bundlephobia.com/package/masonry-snap-grid-layout)
[![CI](https://img.shields.io/github/actions/workflow/status/khachatryan-dev/masonry-snap-grid-layout/publish.yml?style=flat-square&labelColor=1e1b4b&color=6366f1&label=CI)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-6366f1?style=flat-square&labelColor=1e1b4b)](./LICENSE)
[![Zero deps](https://img.shields.io/badge/dependencies-0-6366f1?style=flat-square&labelColor=1e1b4b)](./package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-6366f1?style=flat-square&labelColor=1e1b4b&logo=typescript&logoColor=white)](./tsconfig.json)

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=000)](https://buymeacoffee.com/arkhachats)

<br/>

[![Vanilla JS Demo](https://img.shields.io/badge/%E2%96%B6%20Vanilla%20JS-demo-f7df1e?style=for-the-badge)](https://codesandbox.io/p/sandbox/l9xl7s)
[![React Demo](https://img.shields.io/badge/%E2%96%B6%20React-demo-61dafb?style=for-the-badge)](https://codesandbox.io/p/sandbox/rgxsxp)
[![Vue 3 Demo](https://img.shields.io/badge/%E2%96%B6%20Vue%203-demo-42b883?style=for-the-badge)](https://codesandbox.io/p/devbox/r58pdw)
[![Angular Demo](https://img.shields.io/badge/%E2%96%B6%20Angular-demo-dd0031?style=for-the-badge)](#)

</div>

---

## Overview

`masonry-snap-grid-layout` is a **zero-dependency**, **TypeScript-first** masonry layout engine that works across every major framework. It uses **native CSS masonry** when the browser supports it and falls back to a smooth JS engine otherwise — giving you the best of both worlds with no extra configuration.

```
+----------+  +--------------+  +-------+
|  Card 1  |  |   Card 2     |  | Card  |
|          |  |   (tall)     |  |   3   |
+----------+  |              |  +-------+
+-----------+ |              |  +-------------+
|   Card 4  | +--------------+  |   Card 5    |
|   (tall)  |  +----------+     |             |
|           |  |  Card 6  |     +-------------+
+-----------+  +----------+
```

---

## Features

| | Feature | Detail |
|---|---|---|
| CSS-First | **Native CSS Masonry** | Uses `grid-template-rows: masonry` when the browser supports it |
| JS Engine | **Robust JS Fallback** | Absolute-position layout works in every browser today |
| SSR | **Server-Side Rendering** | Items in page source — SEO-friendly, no layout shift |
| Virtualization | **Scroll Virtualization** | Only renders visible items for huge lists (React + Vue) |
| Zero Deps | **No Dependencies** | Nothing to audit, nothing to update |
| TypeScript | **Fully Typed** | Generic `<T>` for your data, typed props and slots |
| Animations | **Smooth Transitions** | CSS `transform` transitions on layout changes |
| Responsive | **ResizeObserver** | Recalculates columns automatically on container resize |
| Frameworks | **Multi-Framework** | Vanilla JS · React · Vue 3 · Angular |

---

## Installation

```bash
# npm
npm install masonry-snap-grid-layout

# yarn
yarn add masonry-snap-grid-layout

# pnpm
pnpm add masonry-snap-grid-layout

# bun
bun add masonry-snap-grid-layout
```

---

## Quick Start

### Vanilla JS

```js
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

const masonry = new MasonrySnapGridLayout(document.getElementById('grid'), {
  layoutMode: 'auto',   // 'auto' | 'js'
  gutter: 16,
  minColWidth: 240,
  animate: true,
  items,
  renderItem: (item) => {
    const el = document.createElement('div');
    el.style.height = item.height + 'px';
    el.textContent = item.title;
    return el;
  },
});

// Update items dynamically
masonry.updateItems(newItems);

// Clean up
masonry.destroy();
```

---

### React

SSR-safe — works with Next.js App Router, Pages Router, Remix, and plain Vite.

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
      virtualize          // only render visible items
      overscan={300}      // px above/below viewport to keep rendered
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
1. Server renders all items inside a responsive CSS grid — visible HTML for crawlers
2. Browser receives full HTML immediately — fast First Contentful Paint
3. Client hydrates, measures item heights, applies masonry transforms
4. `ResizeObserver` keeps layout correct on every container resize

---

### Vue 3

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
    :virtualize="true"
    :overscan="300"
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

### Angular

Standalone component — works with Angular 17+ and the default Ivy compiler.

```typescript
// app.component.ts
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';

interface Item { id: number; title: string; height: number; }

@Component({
  selector: 'app-root',
  standalone: true,
  template: `<div #grid></div>`,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('grid') gridRef!: ElementRef<HTMLDivElement>;
  private masonry?: MasonrySnapGridLayout<Item>;

  items: Item[] = [/* ... */];

  ngAfterViewInit(): void {
    this.masonry = new MasonrySnapGridLayout<Item>(this.gridRef.nativeElement, {
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

  ngOnDestroy(): void {
    this.masonry?.destroy();
  }
}
```

Import the stylesheet in `src/styles.css`:

```css
@import 'masonry-snap-grid-layout/style.css';
```

---

## API Reference

### Core Options (Vanilla JS + all frameworks)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `T[]` | **required** | Array of data items to render |
| `renderItem` | `(item: T) => HTMLElement` | **required** (Vanilla/Angular) | Returns the DOM element for each item |
| `layoutMode` | `'auto' \| 'js'` | `'auto'` | `'auto'` uses native CSS masonry if supported, else JS. `'js'` always uses JS. |
| `gutter` | `number` | `16` | Gap between items in pixels |
| `minColWidth` | `number` | `250` | Minimum column width in pixels. Determines column count. |
| `animate` | `boolean` | `true` | Smooth CSS transform transitions on layout changes |
| `transitionDuration` | `number` | `400` | Transition length in ms (JS mode only) |

### Vanilla JS Methods

```ts
masonry.updateItems(newItems: T[])   // Swap items and re-layout
masonry.destroy()                    // Remove layout styles, stop ResizeObserver
```

### React Props

All core options above apply, plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderItem` | `(item: T) => ReactNode` | **required** | JSX render function (returns React elements, not HTMLElement) |
| `virtualize` | `boolean` | `false` | Only render items in/near the viewport |
| `overscan` | `number` | `300` | Extra pixels above and below the viewport to keep rendered |
| `className` | `string` | — | Extra CSS class on the container element |
| `style` | `CSSProperties` | — | Extra inline styles on the container element |

### Vue Props & Slots

All core options apply as kebab-case props (`:gutter`, `:min-col-width`, etc.), plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `virtualize` | `boolean` | `false` | Only render items in/near the viewport |
| `overscan` | `number` | `300` | Extra pixels above and below the viewport to keep rendered |

| Slot | Slot props | Description |
|------|-----------|-------------|
| `#default` | `{ item: T, index: number }` | Template for each card |

---

## Layout Modes

| Mode | When to use | Browser support |
|------|-------------|-----------------|
| `'auto'` (default) | Always — picks the best engine automatically | All browsers |
| `'js'` | When you need pixel-perfect control or want to force JS layout | All browsers |

`'auto'` detects support via `CSS.supports('grid-template-rows', 'masonry')`. Chrome 135+ and Firefox (behind a flag) currently support it. All other browsers fall back to the JS engine automatically.

---

## Virtualization

For large lists (500+ items), enable virtualization so only the visible portion of the grid is in the DOM:

```tsx
// React
<MasonrySnapGrid items={items} virtualize overscan={300} renderItem={...} />
```

```vue
<!-- Vue -->
<MasonrySnapGrid :items="items" :virtualize="true" :overscan="300">
```

**How it works:**
1. First pass: all items are rendered and their heights are measured and cached
2. Second pass: only items within `viewport height + overscan` are kept in the DOM
3. The container height is set explicitly so the scrollbar stays correct
4. Cached heights are used to compute positions for off-screen items

> Virtualization is JS-mode only. CSS masonry mode always renders all items (browser handles it natively).

---

## Engine Comparison

| | CSS Masonry | JS Masonry |
|---|---|---|
| **Browser support** | Chrome 135+, Firefox (flag) | All browsers |
| **Animations** | Limited | Smooth `transform` transitions |
| **SSR** | Yes | Yes |
| **Performance** | Native GPU | Transform-based, no DOM thrashing |
| **Virtualization** | No | Yes |
| **Column control** | Browser decides | Exact `minColWidth` |

---

## Package Exports

```
masonry-snap-grid-layout          → Vanilla JS class + TypeScript types
masonry-snap-grid-layout/react    → React component
masonry-snap-grid-layout/vue      → Vue 3 component
masonry-snap-grid-layout/angular  → Angular-ready TypeScript source
masonry-snap-grid-layout/style.css → Required stylesheet
```

All exports are tree-shakeable — import only what you use.

---

## Running Examples Locally

Build the library first so examples can import from `dist/`:

```bash
npm run build
```

| Framework | Command | URL |
|-----------|---------|-----|
| **Vanilla JS** | `cd examples/vanilla && npm install && npm run dev` | http://localhost:5173 |
| **React** | `cd examples/react && npm install && npm run dev` | http://localhost:5173 |
| **Vue 3** | `cd examples/vue && npm install && npm run dev` | http://localhost:5173 |
| **Angular** | `cd examples/angular && npm install && npm run dev` | http://localhost:4200 |

Each example includes live controls: layout mode toggle, gutter slider, column width slider, virtualization toggle, overscan slider, animate toggle, and add/remove/reset buttons.

---

## Testing

```bash
npm test
```

Tests are written with **Vitest** and **Testing Library** and cover:

- Column count algorithm (including zero-width containers and edge cases)
- JS masonry layout engine — positioning, column assignment, gutter handling
- CSS masonry engine — grid property output, `auto` mode detection
- `MasonrySnapGridLayout` class — full lifecycle: `init`, `updateItems`, `destroy`, `ResizeObserver`
- React component — SSR output, layout modes, item updates, ResizeObserver teardown
- React virtualization — viewport clipping, overscan, scroll updates, re-measurement on item changes, stable DOM (no infinite loops)

```bash
npm run typecheck   # TypeScript type checking without emitting
npm run build       # Full production build
```

---

## Performance

- **No DOM thrashing** — widths set once, heights read in one pass, transforms applied in a final batch
- **`ResizeObserver`** — responsive layout without polling or debouncing
- **`will-change: transform`** — GPU-composited animations on layout items
- **Virtualization** — keep DOM size bounded regardless of list length
- **Tree-shakeable** — `masonry-snap-grid-layout/react` does not include Vue or Angular code

---

## Contributing

```bash
git clone https://github.com/khachatryan-dev/masonry-snap-grid-layout
cd masonry-snap-grid-layout
npm install
npm test            # run all tests
npm run typecheck   # TypeScript check
npm run build       # build dist/
```

1. Fork the repo
2. Create a feature branch
3. Keep `npm test` green
4. Open a pull request

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

---

## Author

Built and maintained by **Aram Khachatryan**

[![GitHub](https://img.shields.io/badge/GitHub-khachatryan--dev-181717?style=flat-square&logo=github)](https://github.com/khachatryan-dev)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=000)](https://buymeacoffee.com/arkhachats)

---

## License

MIT © [Aram Khachatryan](https://github.com/khachatryan-dev)
