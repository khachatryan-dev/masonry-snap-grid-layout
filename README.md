# masonry-snap-grid-layout

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=brightgreen)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![CI/CD](https://github.com/your-username/masonry-snap-grid-layout/actions/workflows/publish.yml/badge.svg)](https://github.com/your-username/masonry-snap-grid-layout/actions)

A performant masonry grid layout library with smooth animations, customizable gutter, columns, and dynamic item content.

---

## 🚀 Features

- **Dynamic Columns & Gutter**: Automatically adapts to container width.
- **Smooth Animations**: Transitions when layout changes or items shuffle.
- **Customizable Item Content**: Pass your own HTML or render functions.
- **Lightweight & Dependency-Free**: Vanilla TypeScript for easy integration.
- **Responsive & Accessible**: Works well on all screen sizes.

---

## 🔧 Installation

```bash
npm install masonry-snap-grid-layout
# or
yarn add masonry-snap-grid-layout
```

---

## 💡 Usage Example

```ts
import { MasonrySnapGridLayout } from 'masonry-snap-grid-layout';

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
    div.style.padding = '10px';
    div.style.backgroundColor = '#ddd';
    div.style.borderRadius = '8px';
    return div;
  }
});
```

---

## ⚙️ API

### Constructor

```ts
new MasonrySnapGridLayout(container: HTMLElement, options?: MasonrySnapGridLayoutOptions)
```

- **container** — The container element where items are rendered.
- **options** — Configuration options (optional).

### Methods

- `shuffleItems(): void` — Shuffle items randomly with animation.
- `addItems(count: number): void` — Add more items dynamically.

---

## 🛠️ Options

| Option              | Type                                                                 | Default              | Description                                             |
|---------------------|----------------------------------------------------------------------|----------------------|---------------------------------------------------------|
| `gutter`            | `number`                                                             | `16`                 | Spacing between items in pixels.                       |
| `minColWidth`       | `number`                                                             | `250`                | Minimum column width in pixels.                        |
| `animate`           | `boolean`                                                            | `true`               | Enable/disable animations.                             |
| `transitionDuration`| `number`                                                             | `400`                | Animation duration in milliseconds.                    |
| `initialItems`      | `number`                                                             | `30`                 | Number of items generated initially.                   |
| `classNames`        | `object`                                                             | Default CSS classes  | Override CSS class names for styling.                  |
| `itemContent`       | `string` \| `HTMLElement` \| `(index: number) => HTMLElement \| string` | `null`           | Content or content generator callback for items.       |

---

## 🎨 Styling

You can customize the styles by overriding the CSS classes defined or by providing your own CSS class names through the `classNames` option.

---

## 🔁 CI/CD

This package uses **GitHub Actions** to automatically publish new versions to **npm** when you push a version tag like `v1.0.0`.

To use it:
```bash
npm version patch
git push origin main --tags
```

Ensure you have your `NPM_TOKEN` saved in GitHub Secrets for automatic publishing.

---

## 📦 npm Package

📌 [View on npm](https://www.npmjs.com/package/masonry-snap-grid-layout)

---

## 📄 License

MIT © [Aram Khachatryan](https://github.com/khachatryan-dev)