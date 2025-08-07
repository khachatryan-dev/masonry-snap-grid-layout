# masonry-snap-grid-layout

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=brightgreen)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![CI/CD](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions/workflows/publish.yml/badge.svg)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)

A performant masonry grid layout library with smooth animations, customizable gutter, columns, and dynamic item content.

---

## 🚀 Features

* **Dynamic Columns & Gutter**: Automatically adapts to container width.
* **Smooth Animations**: Transitions when layout changes or items shuffle.
* **Customizable Item Content**: Pass your own HTML or render functions.
* **Lightweight & Dependency-Free**: Vanilla TypeScript for easy integration.
* **Responsive & Accessible**: Works well on all screen sizes.

---

## 🔧 Installation

```bash
npm install masonry-snap-grid-layout
# or
yarn add masonry-snap-grid-layout
````

---

## 💡 Usage Example (Vanilla JS)

```ts
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/dist/index.css'; // Import the CSS!

const container = document.getElementById('masonry-container')!;
const masonry = new MasonrySnapGridLayout(container, {
  gutter: 12,
  minColWidth: 200,
  initialItems: 20,
  animate: true,
  transitionDuration: 350,
  itemContent: (index) => {
    const div = document.createElement('div');
    div.textContent = `Custom Item #${index + 1}`;
    return div;
  },
});
```

In your HTML:

```html
<div id="masonry-container" style="position: relative; width: 100%;"></div>
```

---

## 💙 React Usage Example

```tsx
'use client';

import React from 'react';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css'; // Import the CSS!

export default function MasonryGrid() {
  const items = Array.from({ length: 25 }, (_, i) => i);

  return (
    <MasonrySnapGrid
      items={items}
      options={{
        gutter: 16,
        minColWidth: 220,
        animate: true,
        transitionDuration: 400,
      }}
      renderItem={(item, index) => (
        <div>
          React Item #{index + 1}
        </div>
      )}
      className="my-masonry-container"
      style={{ position: 'relative', width: '100%' }}
    />
  );
}
```

---

## ⚙️ API

### Constructor

```ts
new MasonrySnapGridLayout(container: HTMLElement, options?: MasonrySnapGridLayoutOptions)
```

* **container** — The container element where items are rendered.
* **options** — Configuration options (optional).

### Methods

* `shuffleItems(): void` — Shuffle items randomly with animation.
* `addItems(count: number): void` — Add more items dynamically.
* `destroy(): void` — Clean up and remove all items and event listeners.

---

## 🛠️ Options

| Option               | Type                                                                    | Default             | Description                                      |
| -------------------- | ----------------------------------------------------------------------- | ------------------- | ------------------------------------------------ |
| `gutter`             | `number`                                                                | `16`                | Spacing between items in pixels.                 |
| `minColWidth`        | `number`                                                                | `250`               | Minimum column width in pixels.                  |
| `animate`            | `boolean`                                                               | `true`              | Enable/disable animations.                       |
| `transitionDuration` | `number`                                                                | `400`               | Animation duration in milliseconds.              |
| `initialItems`       | `number`                                                                | `30`                | Number of items generated initially.             |
| `classNames`         | `Partial<MasonrySnapGridLayoutClassNames>`                              | Default CSS classes | Override CSS class names for styling.            |
| `itemContent`        | `string` \| `HTMLElement` \| `(index: number) => HTMLElement \| string` | `null`              | Content or content generator callback for items. |

---

## 🎨 Styling & Animations

You can customize styles by overriding the CSS classes or providing your own via the `classNames` option.

The layout uses smooth `transform` transitions with `cubic-bezier(0.4, 0, 0.2, 1)` easing for a polished, natural animation effect.

---

## 🔁 CI/CD

This package uses **GitHub Actions** to automatically publish new versions to **npm** when you push a version tag like `v1.0.0`.

To use it:

```bash
npm version patch
git push origin main --tags
```

Make sure your `NPM_TOKEN` is saved in GitHub Secrets for automatic publishing.

---

## 📦 npm Package

📌 [View on npm](https://www.npmjs.com/package/masonry-snap-grid-layout)

---

## 📄 License

MIT © [Aram Khachatryan](https://github.com/khachatryan-dev)

---
