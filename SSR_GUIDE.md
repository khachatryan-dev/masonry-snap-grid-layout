# SSR (Server-Side Rendering) Support

This package has **full support for SSR environments** including Next.js, Nuxt.js, SvelteKit, and other frameworks that render components on the server.

## How It Works

### Core Architecture
- **Server-side**: Component renders server-rendered items without initializing the masonry layout
- **Client-side**: After hydration, the component initializes the masonry layout and takes over positioning

### SSR Detection
The package automatically detects SSR environments by checking:
```typescript
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
```

## Next.js Integration

### Installation
```bash
npm install masonry-snap-grid-layout
```

### Usage (App Router)

```typescript
// app/components/MasonryGrid.tsx
'use client';

import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

type Item = {
  id: number;
  title: string;
  height: number;
};

export default function MasonryGrid({ items }: { items: Item[] }) {
  return (
    <MasonrySnapGrid<Item>
      items={items}
      gutter={16}
      minColWidth={220}
      layoutMode="auto"
      animate
      transitionDuration={400}
      renderItem={(item) => (
        <div style={{ height: item.height, background: '#f0f0f0' }}>
          <h3>{item.title}</h3>
        </div>
      )}
    />
  );
}
```

### Usage in Server Components
```typescript
// app/page.tsx
import MasonryGrid from './components/MasonryGrid';

const items = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  title: `Card ${i + 1}`,
  height: 140 + Math.random() * 160,
}));

export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Masonry Grid</h1>
      <MasonryGrid items={items} />
    </div>
  );
}
```

### Pages Router
For Next.js Pages Router (legacy), use the same client component:

```typescript
// pages/index.tsx
import MasonryGrid from '../components/MasonryGrid';

export default function Home() {
  const items = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    title: `Card ${i + 1}`,
    height: 140 + Math.random() * 160,
  }));

  return <MasonryGrid items={items} />;
}
```

## Nuxt.js Integration

### Installation
```bash
npm install masonry-snap-grid-layout
```

### Usage
```vue
<!-- components/MasonryGrid.vue -->
<template>
  <MasonrySnapGrid
    :items="items"
    :gutter="16"
    :min-col-width="220"
    layout-mode="auto"
    :animate="true"
    :transition-duration="400"
  >
    <template #default="{ item }">
      <div :style="{ height: item.height + 'px', background: '#f0f0f0' }">
        <h3>{{ item.title }}</h3>
      </div>
    </template>
  </MasonrySnapGrid>
</template>

<script setup lang="ts">
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import 'masonry-snap-grid-layout/dist/index.css';

interface Item {
  id: number;
  title: string;
  height: number;
}

const items = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  title: `Card ${i + 1}`,
  height: 140 + Math.random() * 160,
}));
</script>
```

## How SSR Works in This Package

### Phase 1: Server Rendering
When rendering on the server:
1. Component receives items from props
2. Server renders placeholder items in simple inline-block layout
3. CSS is included for styling
4. **No JavaScript initialization happens** (no ResizeObserver, no positioning)
5. HTML is sent to client with SEO-friendly content

### Phase 2: Client Hydration
When the component mounts on the client:
1. React/Vue hydrates the server-rendered HTML
2. `useEffect` (React) or `onMounted` (Vue) detects client environment
3. Masonry instance is initialized
4. ResizeObserver is set up
5. Items are positioned using JavaScript or CSS masonry
6. Server-rendered placeholder HTML is replaced with masonry-positioned items

### Phase 3: Client-side Updates
1. When items change, masonry layout updates
2. ResizeObserver triggers layout recalculation on window resize
3. Smooth animations occur based on `transitionDuration` prop

## Key Features for SSR

### ✅ Automatic SSR Detection
The package automatically detects SSR environments and:
- Skips client-side initialization on the server
- Only initializes layout after hydration
- Prevents errors from missing `window` or `document` objects

### ✅ Graceful Degradation
- Server renders items in a simple stacked layout
- No layout shift after hydration (because items are pre-rendered)
- Progressive enhancement: layout improves after hydration

### ✅ SEO Friendly
- All items are rendered on the server (crawlable by search engines)
- Server-rendered HTML is semantically valid
- No content is hidden behind client-side rendering

### ✅ Performance Optimized
- Server renders HTML without JavaScript overhead
- Client-side positioning uses GPU-accelerated transforms
- ResizeObserver throttled to animation frames for smooth performance

## Best Practices

### 1. Always Use "use client" Directive
For React in Next.js:
```typescript
'use client'; // This is automatically added to the React wrapper

import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
```

### 2. Pass Items from Server
```typescript
// ✅ Good: Items come from server-side props or fetch
export default async function Page() {
  const items = await fetchItems();
  return <MasonryGrid items={items} />;
}

// ❌ Avoid: Fetching inside client component if possible
'use client';
export default function Grid() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetchItems().then(setItems);
  }, []);
}
```

### 3. Optimize Images
If using images inside items:
```typescript
renderItem={(item) => (
  <div>
    <img 
      src={item.image} 
      alt={item.title}
      // Important: Let masonry wait for image load for accurate height
    />
    <h3>{item.title}</h3>
  </div>
)}
```

The React wrapper automatically waits for images to load before first layout pass.

### 4. CSS Import
Always import the CSS in your client component:
```typescript
import 'masonry-snap-grid-layout/dist/index.css';
```

## Troubleshooting

### Issue: Hydration Mismatch
**Problem**: Warning about hydration mismatch after server render

**Solution**: This is expected if server renders items in a simple layout. The package handles this automatically by clearing server content after hydration.

### Issue: Items Stacking After Hydration
**Problem**: Items appear stacked vertically after page loads

**Cause**: Images haven't finished loading yet

**Solution**: The React wrapper includes `waitForImages` which waits up to 1000ms for images to load. Ensure:
- Images have proper dimensions set
- Images are not too large (optimize images)
- Check network tab for slow image loads

### Issue: Layout Not Updating on Resize
**Problem**: Layout doesn't recalculate when window resizes

**Solution**: Ensure the container has a defined width and the component is not hidden:
```typescript
<div style={{ width: '100%', minHeight: '100vh' }}>
  <MasonrySnapGrid items={items} />
</div>
```

## Performance Considerations

### For SSR:
- Server rendering is fast (no JavaScript execution)
- HTML payload is slightly larger (contains all items pre-rendered)
- Time to Interactive (TTI) is quick (client takes over layout after hydration)

### For Client:
- Initial layout calculation: ~5-10ms
- ResizeObserver throttled to animation frames
- Transform-based positioning uses GPU acceleration
- Memory efficient: reuses DOM elements via pooling

## Browser Support

The package automatically:
- Uses native **CSS Masonry** in Chrome/Edge (when available)
- Falls back to **JavaScript positioning** in other browsers
- Works in **all modern browsers** (including SSR environments)

## Files Included

- `index.mjs` / `index.cjs` - Core masonry library
- `react.mjs` / `react.cjs` - React wrapper with SSR support
- `vue.mjs` / `vue.cjs` - Vue wrapper with SSR support
- `index.css` - Styles (works on both server and client)
- `index.d.ts` / `*.d.ts` - TypeScript definitions

