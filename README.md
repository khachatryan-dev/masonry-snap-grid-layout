<div align="center">

# masonry-snap-grid-layout

**Masonry grid layout for React, Vue 3, Angular, and Vanilla JS.**

Pinterest-style responsive image galleries with scroll virtualization and SSR.
One framework-agnostic layout core. Four adapters. Zero dependencies.

<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://raw.githubusercontent.com/khachatryan-dev/masonry-snap-grid-layout/main/.github/assets/masonry-hero-dark.svg"
  />
  <img
    src="https://raw.githubusercontent.com/khachatryan-dev/masonry-snap-grid-layout/main/.github/assets/masonry-hero-light.svg"
    alt="A six-column masonry grid of items with varying heights, each placed in the shortest available column"
    width="880"
  />
</picture>

<!-- Package -->

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![npm downloads](https://img.shields.io/npm/dm/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![jsDelivr hits](https://data.jsdelivr.com/v1/package/npm/masonry-snap-grid-layout/badge)](https://www.jsdelivr.com/package/npm/masonry-snap-grid-layout)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/masonry-snap-grid-layout?color=6366f1&labelColor=1e1b4b&style=flat-square&label=minzipped)](https://bundlephobia.com/package/masonry-snap-grid-layout)

<!-- Quality -->

[![CI](https://img.shields.io/github/actions/workflow/status/khachatryan-dev/masonry-snap-grid-layout/publish.yml?style=flat-square&labelColor=1e1b4b&color=6366f1&label=CI)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-6366f1?style=flat-square&labelColor=1e1b4b)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-6366f1?style=flat-square&labelColor=1e1b4b&logo=typescript&logoColor=white)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/tsconfig.json)
[![Socket](https://badge.socket.dev/npm/package/masonry-snap-grid-layout/1.3.0?style=flat-square&labelColor=1e1b4b&logo=socket&logoColor=white&color=6366f1)](https://socket.dev/npm/package/masonry-snap-grid-layout)
[![License: MIT](https://img.shields.io/badge/license-MIT-6366f1?style=flat-square&labelColor=1e1b4b)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/LICENSE)

<br />

**Try it**

[![Vanilla JS Sandbox](https://img.shields.io/badge/%E2%96%B6%20Vanilla%20JS-sandbox-f7df1e?style=for-the-badge)](https://codesandbox.io/p/sandbox/l9xl7s)
[![React Sandbox](https://img.shields.io/badge/%E2%96%B6%20React-sandbox-61dafb?style=for-the-badge)](https://codesandbox.io/p/sandbox/rgxsxp)
[![Vue 3 Sandbox](https://img.shields.io/badge/%E2%96%B6%20Vue%203-sandbox-42b883?style=for-the-badge)](https://codesandbox.io/p/devbox/r58pdw)

[![Run the examples locally](https://img.shields.io/badge/%E2%9A%99%20All%20four%20frameworks-run%20locally-6366f1?style=for-the-badge&labelColor=1e1b4b)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/tree/main/examples)

</div>

---

## Overview

`masonry-snap-grid-layout` is a **zero-dependency**, **TypeScript-first** masonry layout
engine for building Pinterest-style grids and responsive image galleries. It ships
first-class components for **React**, **Vue 3**, and **Angular**, plus a plain
**Vanilla JS** class — all driven by the same core, so every adapter produces identical
placement.

It uses **native CSS masonry** where a browser supports it and falls back to a fast JS
engine everywhere else, with no configuration either way. Items are placed by a
shortest-column-first algorithm:

```
┌──────────┐  ┌──────────────┐  ┌─────────┐
│  Card 1  │  │   Card 2     │  │ Card 3  │
└──────────┘  │   (tall)     │  └─────────┘
┌───────────┐ │              │  ┌─────────────┐
│  Card 4   │ └──────────────┘  │   Card 5    │
│  (tall)   │ ┌──────────┐      │             │
└───────────┘ │  Card 6  │      └─────────────┘
              └──────────┘
```

The layout is **self-healing**. Images decoding, web fonts swapping, and embeds resizing
each trigger an automatic relayout, so you never hit the classic masonry failure of items
overlapping because they were measured before their content settled — no
`imagesLoaded`-style helper required.

It also handles the parts most masonry libraries leave to you: **scroll virtualization**
for very large lists (against the page or any scrollable panel), **responsive column
breakpoints**, **server-side rendering** for Next.js and Nuxt, and **keyed
reconciliation** so reordering or filtering a list does not scramble it.

---

## Table of Contents

- [Why this library](#why-this-library)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start) · [Vanilla JS](#vanilla-js) · [React](#react) · [Vue 3](#vue-3) · [Angular](#angular)
- [API Reference](#api-reference)
- [Layout Modes](#layout-modes)
- [Columns and Breakpoints](#columns-and-breakpoints)
- [Images and Async Content](#images-and-async-content)
- [Virtualization](#virtualization)
- [Item Identity](#item-identity)
- [Server-Side Rendering](#server-side-rendering)
- [Recipes](#recipes)
- [Engine Comparison](#engine-comparison)
- [Browser Support](#browser-support)
- [Package Exports](#package-exports)
- [TypeScript](#typescript)
- [Performance](#performance)
- [Running Examples Locally](#running-examples-locally)
- [Testing](#testing)
- [Upgrading](#upgrading)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Why this library

- **One engine, four frameworks.** The layout algorithm is not reimplemented per
  adapter, so React, Vue, Angular, and Vanilla produce byte-identical placement.
- **Images actually work.** Per-item observation means a gallery lays out correctly
  even though heights are unknown at first paint. Most masonry libraries require you to
  wire up an `imagesLoaded`-style helper yourself.
- **Virtualization that fits real apps.** Virtualize against the page _or_ any
  `overflow: auto` panel, modal, or dashboard pane — and skip the initial full mount
  entirely with `estimatedItemHeight`.
- **SSR-first.** Items are present in the server-rendered HTML, so they are crawlable
  and painted before hydration.
- **Small and dependency-free.** Roughly 5 kB gzipped including shared chunks, with a
  size budget enforced in CI.
- **Verified across every adapter.** 251 tests covering Vanilla, React, Vue, and
  Angular, plus three separate typecheck passes — including a suite that renders in
  pure Node with no `window`, testing the real SSR path rather than a jsdom imitation.

---

## Features

| Category           | Feature                    | Detail                                                                  |
| ------------------ | -------------------------- | ----------------------------------------------------------------------- |
| **Self-healing**   | Images &amp; async content | Relayouts when images decode, fonts swap, or embeds resize              |
| **Columns**        | Explicit &amp; responsive  | Fixed `columns`, or a mobile-first map like `{ 0: 1, 640: 2, 1024: 3 }` |
| **Virtualization** | Page or scroll container   | Virtualize against the window _or_ any `overflow: auto` element         |
| **Large lists**    | Estimated heights          | `estimatedItemHeight` skips the render-everything measurement pass      |
| **CSS-first**      | Native CSS masonry         | Uses `grid-template-rows: masonry` when the browser supports it         |
| **JS engine**      | Universal fallback         | Absolute-position layout works in every browser today                   |
| **SSR**            | Server-side rendering      | Items in the page source — crawlable, painted before hydration          |
| **Item identity**  | Keyed reconciliation       | `getItemKey` reuses DOM nodes across reorders, filters, and prepends    |
| **Performance**    | Frame-coalesced            | Scroll, resize, and image events collapse into one layout per frame     |
| **Responsive**     | `ResizeObserver`           | Recalculates columns automatically on container resize                  |
| **Animations**     | Smooth transitions         | GPU-composited CSS `transform` transitions on layout changes            |
| **TypeScript**     | Fully typed                | Generic `<T>` for your data, typed props, slots, and events             |
| **Zero deps**      | No dependencies            | Nothing to audit, nothing to update                                     |
| **Frameworks**     | Multi-framework            | Vanilla JS · React · Vue 3 · Angular                                    |

---

## Installation

```bash
npm install masonry-snap-grid-layout
```

```bash
yarn add masonry-snap-grid-layout
pnpm add masonry-snap-grid-layout
bun add masonry-snap-grid-layout
```

The stylesheet is required in every framework:

```js
import 'masonry-snap-grid-layout/style.css';
```

Or via CDN:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/masonry-snap-grid-layout/dist/style.css"
/>
```

React, Vue, and Angular are **optional peer dependencies** — install only the one you
use. Nothing from the other frameworks is included in your bundle.

---

## Quick Start

### Vanilla JS

```js
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

const masonry = new MasonrySnapGridLayout(document.getElementById('grid'), {
  items,
  gutter: 16,
  minColWidth: 240,
  getItemKey: (item) => item.id, // enables DOM reuse across updates
  renderItem: (item, index) => {
    const el = document.createElement('div');
    el.style.height = `${item.height}px`;
    el.textContent = `${index}. ${item.title}`;
    return el;
  },
});

masonry.updateItems(newItems); // swap the data
masonry.setOptions({ gutter: 24 }); // change options in place
masonry.refresh(); // force a layout pass
masonry.destroy(); // remove styles, stop all observers
```

---

### React

SSR-safe — works with Next.js (App and Pages Router), Remix, and plain Vite.

```tsx
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/style.css';

export default function Gallery({ items }) {
  return (
    <MasonrySnapGrid
      items={items}
      columns={{ 0: 1, 640: 2, 1024: 3 }}
      gutter={16}
      getItemKey={(item) => item.id}
      virtualize
      overscan={300}
      renderItem={(item) => (
        <article style={{ borderRadius: 12, overflow: 'hidden' }}>
          <img src={item.src} alt={item.alt} style={{ width: '100%' }} />
          <h3>{item.title}</h3>
        </article>
      )}
    />
  );
}
```

Images need no extra wiring — the grid relayouts as each one decodes.

---

### Vue 3

Drop-in component with a typed scoped slot.

```vue
<script setup lang="ts">
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import 'masonry-snap-grid-layout/style.css';

const items = [/* ... */];
</script>

<template>
  <MasonrySnapGrid
    :items="items"
    :columns="{ 0: 1, 640: 2, 1024: 3 }"
    :gutter="16"
    :get-item-key="(item) => item.id"
    :virtualize="true"
    :overscan="300"
    @layout="(info) => console.log(info.columnCount)"
  >
    <template #default="{ item, index }">
      <article :style="{ borderRadius: '12px' }">
        <img :src="item.src" :alt="item.alt" style="width: 100%" />
        <h3>{{ index }}. {{ item.title }}</h3>
      </article>
    </template>
  </MasonrySnapGrid>
</template>
```

---

### Angular

A **standalone component** ships with the package, for Angular 17+.

```typescript
import { Component } from '@angular/core';
import { MasonrySnapGridComponent } from 'masonry-snap-grid-layout/angular';
import type { LayoutInfo } from 'masonry-snap-grid-layout';

interface Card {
  id: number;
  title: string;
  height: number;
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [MasonrySnapGridComponent],
  template: `
    <masonry-snap-grid
      [items]="items"
      [gutter]="16"
      [minColWidth]="240"
      [columns]="{ 0: 1, 640: 2, 1024: 3 }"
      [getItemKey]="trackById"
      [renderItem]="renderCard"
      (layout)="onLayout($event)"
    />
  `,
})
export class GalleryComponent {
  items: Card[] = [/* ... */];

  trackById = (card: Card): number => card.id;

  // renderItem returns a DOM element, so it is defined as a class field
  // rather than a method — `this` must stay bound.
  renderCard = (card: Card, index: number): HTMLElement => {
    const el = document.createElement('div');
    el.style.height = `${card.height}px`;
    el.textContent = `${index}. ${card.title}`;
    return el;
  };

  onLayout(info: LayoutInfo): void {
    console.log(`${info.columnCount} columns`);
  }
}
```

Import the stylesheet once in `src/styles.css`:

```css
@import 'masonry-snap-grid-layout/style.css';
```

> **Two Angular caveats.** `renderItem` returns an `HTMLElement`, so Angular templates
> and directives cannot be used for item content — build the element imperatively, or
> drive the engine directly (below) and project your own template. Virtualization is
> **not** available in Angular; use React or Vue if you need it.

<details>
<summary>Using the engine directly instead of the component</summary>

```typescript
import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `<div #grid></div>`,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('grid') gridRef!: ElementRef<HTMLDivElement>;
  private masonry?: MasonrySnapGridLayout<Card>;

  ngAfterViewInit(): void {
    this.masonry = new MasonrySnapGridLayout<Card>(this.gridRef.nativeElement, {
      items: this.items,
      gutter: 16,
      renderItem: (item) => {
        const el = document.createElement('div');
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

</details>

---

## API Reference

### Core options

Shared by the Vanilla engine and every adapter. Only `items` and `renderItem` are
required.

| Option                | Type                                           | Default      | Description                                                                                           |
| --------------------- | ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| `items`               | `T[]`                                          | **required** | Array of data items to render.                                                                        |
| `renderItem`          | `(item: T, index: number) => HTMLElement`      | **required** | Returns the DOM element for each item. React and Vue use JSX/slots instead.                           |
| `layoutMode`          | `'auto' \| 'js'`                               | `'auto'`     | `'auto'` uses native CSS masonry when supported, else JS. `'js'` always uses JS.                      |
| `gutter`              | `number`                                       | `16`         | Gap between items, in pixels.                                                                         |
| `minColWidth`         | `number`                                       | `250`        | Minimum column width, in pixels. Determines the column count.                                         |
| `columns`             | `number \| Record<number, number>`             | —            | Fixed column count, or a breakpoint map. Overrides `minColWidth`. [Details](#columns-and-breakpoints) |
| `animate`             | `boolean`                                      | `true`       | Smooth CSS `transform` transitions on layout changes.                                                 |
| `transitionDuration`  | `number`                                       | `400`        | Transition length in ms (JS mode only).                                                               |
| `observeItemResize`   | `boolean`                                      | `true`       | Relayout when an item's own size changes. [Details](#images-and-async-content)                        |
| `watchImages`         | `boolean`                                      | `true`       | Also listen for `load` / `error` on images inside items.                                              |
| `estimatedItemHeight` | `number`                                       | —            | Height assumed before measurement. [Details](#very-large-lists)                                       |
| `getItemKey`          | `(item: T, index: number) => string \| number` | —            | Stable item identity. [Details](#item-identity)                                                       |
| `onLayout`            | `(info: LayoutInfo) => void`                   | —            | Called after each layout pass.                                                                        |

### Vanilla JS methods

```ts
masonry.updateItems(items: T[])       // Swap items and re-layout
masonry.setOptions(partialOptions)    // Change any option in place, including layoutMode
masonry.refresh()                     // Force a layout pass
masonry.destroy()                     // Remove layout styles, stop all observers
```

`refresh()` is rarely needed — item resizes, image loads, and container resizes are all
detected automatically. Reach for it only after mutating item content directly.

### React props

All core options apply, plus:

| Prop              | Type                                            | Default      | Description                                                                 |
| ----------------- | ----------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `renderItem`      | `(item: T, index: number) => ReactNode`         | **required** | JSX render function (returns React elements, not `HTMLElement`).            |
| `virtualize`      | `boolean`                                       | `false`      | Only render items in or near the viewport.                                  |
| `overscan`        | `number`                                        | `300`        | Extra pixels above and below the viewport to keep rendered.                 |
| `scrollContainer` | `HTMLElement \| RefObject \| Window \| () => …` | `window`     | Scrolling viewport to virtualize against. [Details](#in-a-scroll-container) |
| `getItemKey`      | `(item: T, index: number) => React.Key`         | index        | Stable React `key`.                                                         |
| `className`       | `string`                                        | —            | Extra CSS class on the container.                                           |
| `style`           | `CSSProperties`                                 | —            | Extra inline styles on the container.                                       |

### Vue props, slots, and events

Core options apply as kebab-case props (`:gutter`, `:min-col-width`, `:columns`), plus:

| Prop               | Type                               | Default  | Description                                |
| ------------------ | ---------------------------------- | -------- | ------------------------------------------ |
| `virtualize`       | `boolean`                          | `false`  | Only render items in or near the viewport. |
| `overscan`         | `number`                           | `300`    | Extra pixels to keep rendered.             |
| `scroll-container` | `HTMLElement \| Window \| () => …` | `window` | Scrolling viewport to virtualize against.  |
| `get-item-key`     | `(item: T, i: number) => key`      | index    | Stable `:key`.                             |

| Slot       | Slot props                   | Description             |
| ---------- | ---------------------------- | ----------------------- |
| `#default` | `{ item: T, index: number }` | Template for each card. |

| Event    | Payload      | Description                     |
| -------- | ------------ | ------------------------------- |
| `layout` | `LayoutInfo` | Emitted after each layout pass. |

Exposed via template ref: `refresh()` forces a layout pass.

### Angular inputs and outputs

Selector: `masonry-snap-grid`. Import `MasonrySnapGridComponent` from
`masonry-snap-grid-layout/angular`.

| Member       | Kind      | Notes                                                    |
| ------------ | --------- | -------------------------------------------------------- |
| Core options | `@Input`  | Every option in the core table is available as an input. |
| `layout`     | `@Output` | Emits `LayoutInfo` after each layout pass.               |
| `refresh()`  | method    | Force a layout pass.                                     |

Virtualization is not available in Angular.

### Types

```ts
import type {
  MasonryOptions,
  LayoutMode, // 'auto' | 'js'
  LayoutInfo,
  ColumnsOption, // number | Record<number, number>
  ItemPosition, // { x, y, width }
} from 'masonry-snap-grid-layout';

interface LayoutInfo {
  columnCount: number;
  columnWidth: number;
  containerHeight: number;
  itemCount: number;
  engine: 'css' | 'js';
}
```

---

## Layout Modes

| Mode               | When to use                                                      | Browser support |
| ------------------ | ---------------------------------------------------------------- | --------------- |
| `'auto'` (default) | Always — picks the best available engine automatically           | All browsers    |
| `'js'`             | When you need identical behaviour everywhere, or force JS layout | All browsers    |

`'auto'` detects support at runtime via
`CSS.supports('grid-template-rows', 'masonry')`, so it can never apply the property to a
browser that does not implement it.

Native CSS masonry is still **experimental and unshipped by default** — Firefox has it
behind a flag, Chromium has trialled it behind a flag, and the specification itself is
unsettled (`grid-template-rows: masonry` versus the competing `display: masonry`
proposal). In practice almost every visitor gets the JS engine today. Because the check
happens at runtime, `'auto'` will start using the native path if and when a browser
ships it.

> **Important:** `'auto'` changes engine based on the visitor's browser, and the CSS
> engine supports neither virtualization nor transform animations. If you depend on
> either, set `layoutMode="js"` explicitly so behaviour is identical everywhere.

---

## Columns and Breakpoints

By default the column count is derived from `minColWidth` — as many columns of at least
that width as will fit. For exact control, use `columns`.

```tsx
// A fixed number of columns, regardless of container width
<MasonrySnapGrid items={items} columns={3} renderItem={...} />

// Mobile-first breakpoint map: minimum container width -> column count
<MasonrySnapGrid
  items={items}
  columns={{ 0: 1, 640: 2, 1024: 3, 1440: 4 }}
  renderItem={...}
/>
```

Breakpoint keys are **minimum container widths**, so they read exactly like a
`min-width` media query: one column until 640px, two from 640px, three from 1024px. The
widest key at or below the current width wins, and keys are compared numerically so
declaration order does not matter.

Two details worth knowing:

- Breakpoints track the **container**, not the viewport — a grid inside a sidebar
  responds to the sidebar's width.
- `columns` overrides `minColWidth`. An unusable value (`0`, negative, `NaN`, an empty
  map) falls back to the `minColWidth` calculation rather than producing a broken grid.

---

## Images and Async Content

Masonry has to measure item heights to place them, but images, web fonts, and embeds all
settle **after** that first measurement. A grid measured against undecoded images is laid
out with the wrong heights.

**This is handled for you.** Every item is watched with its own `ResizeObserver`, and
images inside items get `load` / `error` listeners, so the grid relayouts as content
settles:

```tsx
// Nothing to configure — images just work.
<MasonrySnapGrid
  items={photos}
  renderItem={(photo) => <img src={photo.src} alt={photo.alt} />}
/>
```

Every trigger — 200 images finishing at once, a font swap, a container resize — is
coalesced into **one** layout pass per animation frame, so a burst costs a single
relayout rather than one per event.

Opt out if your items are fixed-height and you want to skip the observers entirely:

```tsx
<MasonrySnapGrid observeItemResize={false} watchImages={false} ... />
```

> **Tip:** setting `width` / `height` or `aspect-ratio` on your images still helps. It
> gives the browser a correct box before the image decodes, avoiding the visible reflow
> that self-healing would otherwise have to correct.

---

## Virtualization

For large lists, enable virtualization so only the visible portion of the grid is in the
DOM.

```tsx
// React
<MasonrySnapGrid items={items} virtualize overscan={300} renderItem={...} />
```

```vue
<!-- Vue -->
<MasonrySnapGrid :items="items" :virtualize="true" :overscan="300">
```

**How it works:**

1. Heights are measured and cached.
2. Only items within `viewport height + overscan` stay in the DOM.
3. The container height is computed from **all** items, so the scrollbar stays correct.
4. Cached heights position off-screen items, so nothing shifts as you scroll.

Scroll and resize events are coalesced into at most one update per animation frame, and
the container's offset is re-read each frame — so a sticky header collapsing mid-scroll
cannot desynchronise the visible window.

### In a scroll container

By default virtualization tracks the page. To virtualize inside an `overflow: auto`
panel, modal, or dashboard pane, point it at the element:

```tsx
function Panel({ items }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} style={{ height: 600, overflow: 'auto' }}>
      <MasonrySnapGrid
        items={items}
        virtualize
        scrollContainer={scrollRef}
        renderItem={...}
      />
    </div>
  );
}
```

```vue
<!-- Vue: pass the element itself -->
<div ref="box" style="height: 600px; overflow: auto">
  <MasonrySnapGrid :items="items" :virtualize="true" :scroll-container="box" />
</div>
```

`scrollContainer` accepts an element, a React ref, a getter function, `window`, or
`'window'`. Memoize getter functions — a new identity resubscribes the listeners.

### Very large lists

By default virtualization must mount every item once to learn its height, which defeats
the purpose for tens of thousands of items. Supply `estimatedItemHeight` and positions
are estimated up front, so the very first render is already clipped:

```tsx
<MasonrySnapGrid
  items={items} // 50,000 items
  virtualize
  estimatedItemHeight={240}
  renderItem={...}
/>
```

Real measurements replace the estimate as items scroll through. A rough estimate is
fine — an inaccurate one only means the scrollbar length adjusts as you scroll.

> Virtualization is JS-mode only. CSS masonry mode always renders every item, since the
> browser handles placement natively.

---

## Item Identity

By default items are keyed by array index. That is fine for append-only lists, but if
your list can be **reordered, filtered, sorted, or prepended to**, index keys mean the
DOM node at position `i` gets reused for whatever item now sits there — carrying its
cached height with it.

Pass `getItemKey` to give items real identity:

```tsx
<MasonrySnapGrid items={items} getItemKey={(item) => item.id} renderItem={...} />
```

What it changes per adapter:

- **React / Vue** — becomes the `key`, so nodes move instead of being rebuilt.
- **Vanilla / Angular** — enables keyed reconciliation, so `updateItems()` reuses
  existing elements instead of clearing the container. That preserves focus, text
  selection, scroll position inside items, and in-flight media playback.

---

## Server-Side Rendering

Items are rendered into the initial HTML inside a responsive CSS grid, so they are in the
page source for crawlers and painted before hydration.

1. The server renders every item inside a plain responsive CSS grid.
2. The browser paints that immediately — fast First Contentful Paint.
3. The client hydrates, measures item heights, and applies masonry transforms.
4. `ResizeObserver` keeps the layout correct from then on.

Because step 3 moves items from grid positions to masonry positions, expect one
transition after hydration. Setting `animate={false}` makes it instant rather than
animated.

### Next.js

Add `'use client'` in the App Router, since the component uses browser APIs after
hydration:

```tsx
'use client';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/style.css';
```

No directive is needed in the Pages Router.

### Nuxt

The Vue component works with SSR out of the box. Import the stylesheet in
`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  css: ['masonry-snap-grid-layout/style.css'],
});
```

---

## Recipes

<details>
<summary><b>Responsive image gallery</b></summary>

```tsx
<MasonrySnapGrid
  items={photos}
  columns={{ 0: 2, 768: 3, 1280: 4 }}
  gutter={12}
  getItemKey={(photo) => photo.id}
  renderItem={(photo) => (
    <img
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading="lazy"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  )}
/>
```

Passing `width` / `height` lets the browser reserve the correct box before decode, so
there is nothing for self-healing to correct.

</details>

<details>
<summary><b>Infinite scroll</b></summary>

```tsx
const [items, setItems] = useState(initial);

<MasonrySnapGrid
  items={items}
  getItemKey={(item) => item.id} // required: appended items must keep identity
  virtualize
  estimatedItemHeight={280}
  onLayout={({ containerHeight }) => {
    if (window.scrollY + window.innerHeight > containerHeight - 600) {
      loadMore().then((next) => setItems((prev) => [...prev, ...next]));
    }
  }}
  renderItem={(item) => <Card {...item} />}
/>;
```

</details>

<details>
<summary><b>Reading the resolved layout</b></summary>

```tsx
<MasonrySnapGrid
  items={items}
  onLayout={(info) => {
    console.log(`${info.columnCount} columns of ${info.columnWidth}px`);
    console.log(`total height ${info.containerHeight}px via ${info.engine}`);
  }}
  renderItem={...}
/>
```

</details>

---

## Engine Comparison

|                    | CSS Masonry                   | JS Masonry                        |
| ------------------ | ----------------------------- | --------------------------------- |
| **Availability**   | Experimental, behind flags    | All browsers                      |
| **Animations**     | Limited                       | Smooth `transform` transitions    |
| **SSR**            | Yes                           | Yes                               |
| **Performance**    | Native, GPU                   | Transform-based, no DOM thrashing |
| **Virtualization** | No                            | Yes — page or scroll container    |
| **Self-healing**   | Native                        | Yes — per-item observers          |
| **Column control** | `columns`, or browser decides | Exact `columns` / `minColWidth`   |

---

## Browser Support

The JS engine works in every browser that can run the package's ES2020 output.

Two modern APIs are used, both optional:

| API              | Used for                                   | Without it                                           |
| ---------------- | ------------------------------------------ | ---------------------------------------------------- |
| `ResizeObserver` | Responsive columns and self-healing layout | Layout still runs; it just does not re-run on resize |
| `CSS.supports`   | Detecting native CSS masonry               | Falls back to the JS engine                          |

Both are feature-detected, so there is nothing to polyfill and no crash on older
engines — you simply get a static layout. Server-side rendering touches neither.

---

## Package Exports

| Entry                                | Contents                                 | min+gzip               | min+brotli |
| ------------------------------------ | ---------------------------------------- | ---------------------- | ---------- |
| `masonry-snap-grid-layout`           | Vanilla JS class + TypeScript types      | **2.8 kB**             | 2.5 kB     |
| `masonry-snap-grid-layout/react`     | React component                          | **3.6 kB**             | 3.2 kB     |
| `masonry-snap-grid-layout/vue`       | Vue 3 component                          | **3.8 kB**             | 3.4 kB     |
| `masonry-snap-grid-layout/angular`   | Angular standalone component (TS source) | compiled by your build | —          |
| `masonry-snap-grid-layout/style.css` | Required stylesheet                      | **0.3 kB**             | 0.2 kB     |

Each figure includes every shared chunk that entry pulls in, and is enforced in CI by
`npm run size`.

`dist/` is published **unminified** — readable inside `node_modules`, and every bundler
minifies it anyway — so the numbers above are measured after minification, matching what
you actually ship and what bundlephobia reports. Loading straight from a CDN with no
build step serves the unminified file instead: ~17 kB raw, ~5 kB gzipped over the wire
for the React entry.

All exports are ESM and tree-shakeable. Importing `/react` includes no Vue or Angular
code, and the Vanilla entry contains no virtualization or scroll-tracking code at all.

---

## TypeScript

Every entry point is fully typed, and the item type flows through generically:

```tsx
interface Photo {
  id: string;
  src: string;
  alt: string;
}

// `item` is inferred as Photo in renderItem and getItemKey
<MasonrySnapGrid<Photo>
  items={photos}
  getItemKey={(item) => item.id}
  renderItem={(item) => <img src={item.src} alt={item.alt} />}
/>;
```

The Vue component uses a generic `<script setup>` so the scoped slot is typed too, and
the Angular component is generic over `T`.

---

## Performance

- **No DOM thrashing.** Widths are written in one pass, heights read in one pass, and
  transforms written in a final pass. Reads are never interleaved with writes.
- **Frame coalescing.** Scroll, resize, item-resize, and image-load events all collapse
  into at most one layout per animation frame. A gallery of 200 images finishing
  simultaneously costs one relayout, not 200.
- **Width-only resize handling.** Height changes are ignored, because layout sets the
  container height itself — reacting to it would feed back into a loop.
- **Stable ref callbacks.** Items attach once instead of detaching and reattaching on
  every render.
- **GPU compositing** via `will-change: transform` on layout items.
- **Bounded DOM** through virtualization, with `estimatedItemHeight` avoiding the
  initial full mount.
- **Small.** 3.6 kB min+gzip for the React entry including shared chunks, with a budget
  enforced in CI. See [Package Exports](#package-exports) for every entry point.

---

## Running Examples Locally

Every framework has a full demo app in [`examples/`](https://github.com/khachatryan-dev/masonry-snap-grid-layout/tree/main/examples),
kept in step with this repo — they are typechecked against the local source in CI, so a
renamed prop breaks the build rather than leaving a stale demo behind.

Build the library first so the examples can import from `dist/`:

```bash
npm install
npm run build
```

| Framework      | Command                                             | URL                   |
| -------------- | --------------------------------------------------- | --------------------- |
| **Vanilla JS** | `cd examples/vanilla && npm install && npm run dev` | http://localhost:5173 |
| **React**      | `cd examples/react && npm install && npm run dev`   | http://localhost:5173 |
| **Vue 3**      | `cd examples/vue && npm install && npm run dev`     | http://localhost:5173 |
| **Angular**    | `cd examples/angular && npm install && npm run dev` | http://localhost:4200 |

### What the demos show

Each app has live controls for every feature, plus a status bar reporting the engine in
use and the resolved layout from `onLayout`:

| Control                                      | Demonstrates                                                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content: text / images**                   | Self-healing. The images carry no `width`/`height`, so the grid is first measured against zero-height boxes and re-packs itself as each one decodes. |
| **Columns: min width / fixed / breakpoints** | `minColWidth` versus a fixed `columns` count versus a mobile-first breakpoint map.                                                                   |
| **Scroll container: page / panel**           | Virtualizing against the window versus an `overflow: auto` panel (React and Vue).                                                                    |
| **Estimated heights**                        | `estimatedItemHeight` skipping the initial full mount on a large list (React and Vue).                                                               |
| **Prepend / Shuffle**                        | `getItemKey`. Cards keep their own heights and content because identity travels with the data, not the index.                                        |
| **Layout mode: auto / js**                   | Native CSS masonry detection versus forcing the JS engine.                                                                                           |
| **Gutter, overscan, animate**                | The remaining layout and animation options.                                                                                                          |

| Framework      | Notes                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Vanilla JS** | Drives one instance through `setOptions()` — no destroy-and-rebuild on option changes.                                            |
| **React**      | The fullest demo: every feature above, including both virtualization modes.                                                       |
| **Vue 3**      | Feature parity with React, via the scoped slot and the `@layout` event.                                                           |
| **Angular**    | Uses the standalone `MasonrySnapGridComponent`, so every control is a plain `@Input`. Virtualization is not available in Angular. |

> The hosted CodeSandbox links above are convenient but may lag behind this repo, since
> they pull the published package. The apps in `examples/` are the version-matched
> reference.

---

## Testing

**251 tests** across Vitest, Testing Library, Vue Test Utils, and direct Angular
lifecycle tests — every adapter is covered.

| Area                     | Covers                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| **Layout core**          | Placement, shortest-column selection, tie-breaking, container height, fallback heights      |
| **Columns**              | `minColWidth` derivation, fixed counts, breakpoint resolution, invalid-value fallbacks      |
| **Virtualization core**  | Visible-window maths, overscan, container offset, straddling items, estimate activation     |
| **Scroll core**          | Window and element targets, frame coalescing, offset re-reads, cross-realm target detection |
| **Measurement core**     | Initial-callback suppression, burst coalescing, image `load` / `error`, teardown, polyfills |
| **Vanilla engine**       | Lifecycle, `updateItems`, `setOptions`, `destroy`, keyed reuse, observer teardown           |
| **React**                | SSR output and warnings, layout modes, columns, `onLayout`, item identity, self-healing     |
| **React virtualization** | Viewport clipping, scrolling in and out of view, scroll containers, estimated heights       |
| **Vue**                  | Slot rendering, SSR output, layout, columns, identity, self-healing, teardown               |
| **Vue virtualization**   | Clipping, scroll tracking, scroll containers, estimated heights                             |
| **Angular**              | Engine construction, full input forwarding, `layout` output, keyed reuse, teardown          |
| **CSS fallback**         | Engine selection both ways, throwing/missing `CSS`, track lists, engine switching, teardown |
| **Real SSR (Node)**      | Import safety, markup, no clipping, no warnings, detection with no browser globals          |

```bash
npm test                  # run all tests
npm run typecheck         # core + React, Angular, and Vue SFC compilers
npm run lint              # ESLint, zero warnings tolerated
npm run format:check      # Prettier
npm run size              # gzipped bundle budget per entry point
npm run check:arch        # layer boundaries and import cycles
npm run check:package     # packs the tarball and verifies every export resolves
npm run build             # full production build
npm run verify            # everything above, in the order CI runs it
```

Each adapter is typechecked with the compiler that will actually compile it: `tsc` for
the core and React, a separate Angular config (the Angular component ships as TypeScript
source and compiles in _your_ build), and `vue-tsc` for the SFC.

**SSR is tested for real.** `tests/ssr.test.tsx` runs in a pure Node environment with no
`window`, `document`, `CSS`, `ResizeObserver`, or `requestAnimationFrame` — the same
conditions as a Next.js or Nuxt server. Every other suite runs in jsdom, where those
globals exist, so a `renderToString` test there cannot catch a module that touches the
DOM at import time. The suite asserts the globals are absent before anything else, so it
cannot pass vacuously.

---

## Upgrading

### 1.2.x → 1.3.0

A drop-in upgrade — **no breaking changes**. Every new option is opt-in.

One behavioural change worth knowing: the layout is now **self-healing** by default, so
grids containing images will relayout as those images decode. This corrects a real bug
rather than changing a contract, but if you relied on the layout never re-running, set
`observeItemResize={false}` and `watchImages={false}`.

If you use the Angular entry point, upgrading is **required** —
`masonry-snap-grid-layout/angular` could not resolve in versions before 1.3.0. See the
[changelog](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/CHANGELOG.md) for the full list.

---

## FAQ

### How do I create a masonry layout in React?

Install the package, import from `masonry-snap-grid-layout/react`, and pass `items` plus
a `renderItem` function. There is no wrapper element to configure and no CSS to write
beyond importing the stylesheet — see [Quick Start](#react).

### Does it work with Next.js?

Yes. Items are server-rendered into the HTML, so they are crawlable and painted before
hydration. In the App Router, add `'use client'` to the file that imports the component,
since it uses browser APIs after hydration. No directive is needed in the Pages Router.
See [Server-Side Rendering](#nextjs).

### Does it work with Nuxt or Vue SSR?

Yes, out of the box. Register the stylesheet in `nuxt.config.ts` — see
[Nuxt](#nuxt).

### Why are my items overlapping or leaving big gaps?

Almost always because item heights were measured before the content settled — usually
unloaded images. This library relayouts automatically when images decode, fonts swap, or
embeds resize, so it should self-correct within a frame.

If it does not, check that you have not set `observeItemResize={false}`, and that your
items are not given a fixed height by CSS that hides the real content height. Adding
`width`/`height` or `aspect-ratio` to images avoids the reflow entirely. See
[Images and Async Content](#images-and-async-content).

### How do I set a fixed number of columns?

Pass `columns={3}`. This overrides `minColWidth`. See
[Columns and Breakpoints](#columns-and-breakpoints).

### How do I make the number of columns responsive?

Pass a breakpoint map keyed on minimum **container** width:
`columns={{ 0: 1, 640: 2, 1024: 3 }}`. It reads like a `min-width` media query, and
because it tracks the container rather than the viewport, a grid inside a sidebar
responds to the sidebar.

### Can I virtualize inside a scrollable div instead of the page?

Yes — pass `scrollContainer` an element or a React ref. See
[In a scroll container](#in-a-scroll-container).

### Does it support infinite scroll?

Yes. Use `onLayout` to watch `containerHeight` and append items, and pass `getItemKey`
so appended items keep their identity. There is a worked example under
[Recipes](#recipes).

### How many items can it handle?

With `virtualize` and `estimatedItemHeight`, tens of thousands — only the visible window
plus the overscan buffer is ever in the DOM, and the initial full mount is skipped
entirely. See [Very large lists](#very-large-lists).

### Is virtualization available in Angular?

No. The Angular component wraps the Vanilla engine, which renders all items. Use React
or Vue if you need virtualization.

### Why do items shift slightly right after the page loads?

That is the SSR handoff. The server renders a plain responsive CSS grid; after hydration
the client measures heights and applies masonry positions, which moves items once. Set
`animate={false}` to make it instant instead of animated. See
[Server-Side Rendering](#server-side-rendering).

### How is this different from CSS `columns` or plain CSS Grid?

CSS `columns` fills each column top-to-bottom before starting the next, so reading order
runs _down_ each column — usually wrong for a feed. Plain CSS Grid aligns items to
uniform rows, which leaves gaps under short items. Masonry fills across and packs each
item into the shortest column, which is what produces the Pinterest look. Native CSS
masonry solves this properly but is still [experimental](#layout-modes).

### Do I need to install React, Vue, and Angular?

No. All three are **optional** peer dependencies — install only the one you use. Nothing
from the others reaches your bundle, since each entry point is a separate ESM module.

### How do I animate layout changes?

Animation is on by default in JS mode, using GPU-composited `transform` transitions.
Tune it with `transitionDuration`, or disable it with `animate={false}`. Note that the
native CSS masonry engine cannot animate — pin `layoutMode="js"` if animation matters.

### Does it keep a sensible tab and screen-reader order?

Yes. Items are absolutely positioned, but the DOM order always matches your `items`
array, so tab order and screen-reader order follow your data rather than the visual
packing. As with any masonry layout, visual left-to-right order may differ from DOM
order once columns pack unevenly.

---

## Contributing

```bash
git clone https://github.com/khachatryan-dev/masonry-snap-grid-layout
cd masonry-snap-grid-layout
npm install
npm run verify      # lint, typecheck all adapters, test, build, size, package
```

1. Fork the repo
2. Create a feature branch
3. Keep `npm run verify` green
4. Open a pull request

**Where to make a change.** The layout algorithm, virtualization maths, scroll tracking,
and measurement all live in `src/core/` as framework-agnostic modules, split into
`model/` (pure logic), `lib/` (browser primitives), and `engine/` (DOM writers). The
Vanilla, React, Vue, and Angular adapters are thin shells that consume `src/core`
through its public API, so a fix in the core fixes every framework at once.

Layer boundaries and import cycles are enforced by `npm run check:arch`, so an adapter
reaching into `core/model` — or the pure model reaching for a browser API — fails CI
rather than passing review.

📐 **[ARCHITECTURE.md](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/ARCHITECTURE.md)** is the full map: what lives
where, the dependency rules, and where a given kind of change belongs.

See [CONTRIBUTING.md](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/CONTRIBUTING.md) and the
[Code of Conduct](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/CODE_OF_CONDUCT.md).

---

## Changelog

See [CHANGELOG.md](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/CHANGELOG.md) for release history.

---

## Author

Built and maintained by **Aram Khachatryan**

[![GitHub](https://img.shields.io/badge/GitHub-khachatryan--dev-181717?style=flat-square&logo=github)](https://github.com/khachatryan-dev)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=000)](https://buymeacoffee.com/arkhachats)

If this library saved you time, a ⭐ on
[GitHub](https://github.com/khachatryan-dev/masonry-snap-grid-layout) helps others find
it.

---

## License

[MIT](https://github.com/khachatryan-dev/masonry-snap-grid-layout/blob/main/LICENSE) © [Aram Khachatryan](https://github.com/khachatryan-dev)
