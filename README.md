
# masonry-snap-grid-layout

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=brightgreen)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![CI/CD](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions/workflows/publish.yml/badge.svg)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)
[![Demo Vanilla JS](https://img.shields.io/badge/demo-vanilla%20js-blue)](https://codesandbox.io/p/sandbox/l9xl7s)
[![Demo React](https://img.shields.io/badge/demo-react-blue)](https://codesandbox.io/p/sandbox/rgxsxp)

A **performant, SSR-friendly** masonry grid layout library with smooth animations, customizable gutter, columns, and dynamic item content.

---

## ✨ What's New (v1.0.20)
✅ **SSR-Ready Rendering** — On the server, items are rendered as plain HTML so your grid is SEO-friendly and instantly visible.  
✅ **Hydration Takeover** — On the client, the library recalculates and animates the masonry layout after hydration.  
✅ **Zero Dependencies** — Written in TypeScript, works with React and Vanilla JS.  

---

## 📺 Demo Video

[![Watch the video](https://img.youtube.com/vi/mHK_6z9WEWs/hqdefault.jpg)](https://www.youtube.com/watch?v=mHK_6z9WEWs)

---

## 🚀 Features

- **SSR Friendly (React)**: Server renders static layout → client hydrates → masonry positions are recalculated
- **Dynamic Columns & Gutter**: Adapts automatically to container width
- **Smooth Animations**: CSS-powered transitions when layout changes
- **Customizable Items**: Works with any DOM or React elements
- **Lightweight**: Zero dependencies
- **React & Vanilla JS Support**
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

## 🛠️ API Reference

| Option               | Type                       | Default | Description                  |
| -------------------- | -------------------------- | ------- | ---------------------------- |
| `gutter`             | `number`                   | `16`    | Spacing between items (px)   |
| `minColWidth`        | `number`                   | `250`   | Minimum column width (px)    |
| `animate`            | `boolean`                  | `true`  | Enable/disable animations    |
| `transitionDuration` | `number`                   | `400`   | Animation duration (ms)      |
| `items`              | `Array<T>`                 | `[]`    | Your data items              |
| `renderItem`         | `(item: T) => HTMLElement` | -       | Function to render each item |
| `classNames`         | `Object`                   | -       | Custom CSS class names       |

**Methods**

* `updateItems(newItems: T[])`: Refresh with new items
* `shuffleItems()`: Randomize positions
* `destroy()`: Clean up the instance

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
├── index.js       # Vanilla JS bundle
├── react.js       # React component (SSR-friendly)
├── index.d.ts     # TypeScript types
└── index.css      # Base styles
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


