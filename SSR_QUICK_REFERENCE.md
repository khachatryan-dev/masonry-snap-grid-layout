# SSR Quick Reference Guide

## 🚀 Quick Start for Different Frameworks

### Next.js (App Router)
```tsx
'use client';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

export default function Grid({ items }) {
  return <MasonrySnapGrid items={items} renderItem={renderItem} />;
}
```

### Next.js (Pages Router)
```tsx
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

export default function Page() {
  return <MasonrySnapGrid items={items} renderItem={renderItem} />;
}
```

### Nuxt 3
```vue
<template>
  <MasonrySnapGrid :items="items">
    <template #default="{ item }">
      <div>{{ item.title }}</div>
    </template>
  </MasonrySnapGrid>
</template>

<script setup>
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
</script>
```

### SvelteKit
```svelte
<script>
  import { browser } from '$app/environment';
  import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
  import 'masonry-snap-grid-layout/dist/index.css';

  let container;
  let masonry;

  onMount(() => {
    if (browser && container) {
      masonry = new MasonrySnapGridLayout(container, { items, renderItem });
    }
  });

  onDestroy(() => {
    masonry?.destroy();
  });
</script>

<div bind:this={container}></div>
```

---

## ✅ SSR Checklist

- [ ] Install package: `npm install masonry-snap-grid-layout`
- [ ] Import CSS: `import 'masonry-snap-grid-layout/dist/index.css'`
- [ ] Add `'use client'` (React/Next.js only)
- [ ] Pass items from server/parent component
- [ ] Test local SSR: `npm run dev` or equivalent
- [ ] Test build: `npm run build`
- [ ] Verify no "window is not defined" errors

---

## 🎯 Key Points

| Point | Details |
|-------|---------|
| **'use client' directive** | Only needed for Next.js App Router |
| **Browser detection** | Automatic - handled by library |
| **Hydration** | Automatic - layout initializes after hydration |
| **SEO** | Items are server-rendered (crawlable) |
| **Performance** | Server renders HTML, client enhances layout |
| **No breaking changes** | Backward compatible with existing code |

---

## 📚 Documentation

- **Full Guide**: [SSR_GUIDE.md](./SSR_GUIDE.md)
- **Next.js Example**: [NEXTJS_SSR_EXAMPLE.md](./NEXTJS_SSR_EXAMPLE.md)
- **Implementation Details**: [SSR_IMPLEMENTATION_SUMMARY.md](./SSR_IMPLEMENTATION_SUMMARY.md)

---

## ⚡ Common Issues & Solutions

### "window is not defined"
✅ **Fixed** - Library automatically skips initialization on server

### Hydration mismatch warning
✅ **Expected** - Server renders stacked, client renders masonry (automatic fix)

### Layout appears stacked initially
✅ **Expected** - Transition from stacked to masonry layout (very fast, < 100ms)

### Items not repositioning after update
❓ **Check**: Is container defined? Is masonry instance initialized?

```tsx
// ✅ Good - items updated
<MasonrySnapGrid items={newItems} {...props} />

// ❌ Avoid - items not passed
<MasonrySnapGrid {...props} />
```

---

## 🧪 Testing Your SSR Implementation

```bash
# Development mode (fast rebuild)
npm run dev

# Build mode (tests production build)
npm run build
npm start

# Run tests
npm test

# Type check
npx tsc --noEmit
```

---

## 📱 Framework-Specific Notes

### Next.js
- **App Router**: Use `'use client'` directive
- **Pages Router**: No directive needed
- **Image Optimization**: Compatible with `next/image`
- **Dynamic Imports**: Works with `dynamic()`

### Nuxt
- Automatically SSR-safe
- Works in `nuxi dev` mode
- Works in production build
- Compatible with prerendering

### SvelteKit
- Use `browser` environment variable
- Initialize in `onMount`
- Cleanup in `onDestroy`
- Works with both SSR and static modes

---

## 🔗 Related Resources

- [React Docs - use client](https://react.dev/reference/rsc/use-client)
- [Next.js SSR Guide](https://nextjs.org/docs/pages/building-your-application/rendering)
- [Nuxt SSR](https://nuxt.com/docs/guide/concepts/rendering#server-side-rendering)
- [SvelteKit SSR](https://kit.svelte.dev/docs/adapter-node)

---

## 💡 Pro Tips

### Tip 1: Server-render data
```tsx
// ✅ Good - server fetches data
async function HomePage() {
  const items = await db.getItems();
  return <MasonryGrid items={items} />;
}

// ❌ Avoid - client fetches data
'use client';
export function MasonryGrid() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch('/api/items').then(setItems);
  }, []);
  return <MasonrySnapGrid items={items} />;
}
```

### Tip 2: Optimize images
```tsx
renderItem={(item) => (
  <img 
    src={item.image}
    alt={item.title}
    // Let masonry measure height for accurate layout
    onLoad={() => {/* optional: trigger relayout */}}
  />
)}
```

### Tip 3: Responsive columns
```tsx
const [minColWidth, setMinColWidth] = useState(220);

useEffect(() => {
  const handleResize = () => {
    setMinColWidth(window.innerWidth < 768 ? 150 : 220);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

return <MasonrySnapGrid minColWidth={minColWidth} {...props} />;
```

### Tip 4: Performance monitoring
```tsx
useEffect(() => {
  console.time('masonry-init');
  return () => console.timeEnd('masonry-init');
}, []);
```

---

## 🆘 Need Help?

1. Check [SSR_GUIDE.md](./SSR_GUIDE.md) for detailed explanation
2. See [NEXTJS_SSR_EXAMPLE.md](./NEXTJS_SSR_EXAMPLE.md) for working example
3. Check browser console for errors
4. Ensure CSS is imported
5. Verify items are passed to component

---

**Last Updated**: March 2026
**Package Version**: 1.1.5+

