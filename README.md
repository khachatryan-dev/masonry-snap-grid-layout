# masonry-snap-grid-layout

[![npm version](https://img.shields.io/npm/v/masonry-snap-grid-layout?color=brightgreen)](https://www.npmjs.com/package/masonry-snap-grid-layout)
[![CI/CD](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions/workflows/publish.yml/badge.svg)](https://github.com/khachatryan-dev/masonry-snap-grid-layout/actions)
[![Demo Vanilla JS](https://img.shields.io/badge/demo-vanilla%20js-blue)](https://codesandbox.io/p/sandbox/l9xl7s)
[![Demo React](https://img.shields.io/badge/demo-react-blue)](https://codesandbox.io/p/sandbox/rgxsxp)
[![Angular Core Usage](https://img.shields.io/badge/demo-angular-red)](#angular-service-based-integration)
[![Vue 3 Wrapper](https://img.shields.io/badge/demo-vue%203-green)](#vue-3-wrapper-drop-in-component)

A **performant, SSR-friendly** masonry grid layout library with smooth animations, customizable gutter, columns, and dynamic item content.

> **Next-generation, SSR-safe Masonry layout library** for **Vanilla JS**, **React**, **Vue 3**, and **Angular**, with zero dependencies and smooth animations.

---

# 🌟 Highlights

| Feature                | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| ✅ CSS-First Masonry    | Uses native browser CSS masonry if available for **best performance** |
| ✅ JS Fallback Engine   | Battle-tested JS layout engine for unsupported browsers               |
| ✅ SSR-Friendly React   | Server renders static HTML, client hydrates smoothly                  |
| ✅ Vue 3 Drop-in        | Scoped slot support for full flexibility                              |
| ✅ Angular Lifecycle    | Works inside `ngAfterViewInit`                                        |
| ✅ Zero Dependencies    | Lightweight, fast, and modern                                         |
| ✅ TypeScript-First     | Full type safety                                                      |
| ✅ Smooth Animations    | Works with dynamic content and transitions                            |
| ✅ Responsive & Dynamic | Automatic columns & gutter based on container width                   |

---

# 🎬 Demo Video

[![Watch Demo](https://img.youtube.com/vi/mHK_6z9WEWs/hqdefault.jpg)](https://www.youtube.com/watch?v=mHK_6z9WEWs)

---

# 🖼 Live Demos

| Vanilla JS                                                                                                         | React                                                                                                            | Vue 3                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [![Vanilla Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/l9xl7s) | [![React Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/rgxsxp) | [![Vue Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/xyz123) |

---

# 🚀 Quick Start

### Install

```bash
npm install masonry-snap-grid-layout
# or
yarn add masonry-snap-grid-layout
# or
pnpm add masonry-snap-grid-layout
```

---

### Vanilla JS Example

```js
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/dist/index.css';

const masonry = new MasonrySnapGridLayout(container, {
  layoutMode: 'auto',
  gutter: 16,
  minColWidth: 240,
  animate: true,
  items,
  renderItem: (item) => {
    const el = document.createElement('div');
    el.style.height = item.height + 'px';
    el.style.background = `linear-gradient(135deg, ${item.color} 0%, #fff 100%)`;
    el.textContent = item.title;
    return el;
  },
});
```

---

### React (SSR-Friendly)

```tsx
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

<MasonrySnapGrid
  items={items}
  layoutMode="auto"
  gutter={16}
  minColWidth={240}
  animate
  renderItem={(item) => (
    <div style={{ height: item.height, borderRadius: '12px', padding: '16px' }}>
      {item.title}
    </div>
  )}
/>
```

---

### Vue 3 Drop-in Component

```vue
<template>
  <MasonrySnapGrid :items="items" :gutter="16" :minColWidth="240">
    <template #default="{ item }">
      <div :style="{ height: item.height + 'px', borderRadius: '12px', padding: '16px' }">
        {{ item.title }}
      </div>
    </template>
  </MasonrySnapGrid>
</template>

<script setup lang="ts">
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
</script>
```


---

# ⚡ Engine Comparison

| Feature           | CSS Masonry | JS Masonry |
| ----------------- | ----------- | ---------- |
| Browser Native    | ✅           | ❌          |
| Animation Support | Limited     | ✅ Smooth   |
| SSR Support       | ✅ (React)   | ✅          |
| Zero Dependencies | ✅           | ✅          |
| Performance       | ⚡ Fast      | ⚡ Fast     |

---

# 🧩 API Overview

| Option               | Type                       | Default  | Description          |
| -------------------- | -------------------------- | -------- | -------------------- |
| `layoutMode`         | `'auto' \| 'css' \| 'js'`  | `'auto'` | Engine strategy      |
| `gutter`             | `number`                   | 16       | Space between items  |
| `minColWidth`        | `number`                   | 250      | Minimum column width |
| `animate`            | `boolean`                  | true     | Enable JS animations |
| `transitionDuration` | `number`                   | 400      | Duration (ms)        |
| `items`              | `Array<T>`                 | required | Data items           |
| `renderItem`         | `(item: T) => HTMLElement` | required | Render function      |

**Methods**:

```ts
updateItems(newItems: T[])
destroy()
```

---

# 🧪 Testing

Built with **Vitest**. Covers:

* Core layout engine
* React SSR hydration
* Vue 3 wrapper
* Lifecycle & Angular usage
* Zero-width container handling

``` bash
npm test
```

---

# 📈 Performance & Best Practices

* Minimal DOM thrashing using `transform`
* `ResizeObserver` for responsive layout
* Optimized for dashboards, galleries, and dynamic content
* Handles zero-width containers gracefully

---

# 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes
4. Open a Pull Request

---

# 📄 License

MIT © [Aram Khachatryan](https://github.com/khachatryan-dev)

---

