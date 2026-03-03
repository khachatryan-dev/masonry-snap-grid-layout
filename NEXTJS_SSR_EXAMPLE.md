# Next.js SSR Example

This example demonstrates how to use `masonry-snap-grid-layout` in a Next.js project with full SSR support.

## Project Structure

```
nextjs-masonry-example/
├── app/
│   ├── components/
│   │   └── MasonryGrid.tsx    # Client component with masonry
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── package.json
└── tsconfig.json
```

## Setup

```bash
# Create Next.js project
npx create-next-app@latest nextjs-masonry-example --typescript --tailwind

# Install masonry package
cd nextjs-masonry-example
npm install masonry-snap-grid-layout
```

## Implementation

### 1. Client Component (`app/components/MasonryGrid.tsx`)

```typescript
'use client';

import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

type Item = {
  id: number;
  title: string;
  height: number;
  color: string;
};

interface MasonryGridProps {
  items: Item[];
}

export default function MasonryGrid({ items }: MasonryGridProps) {
  return (
    <MasonrySnapGrid<Item>
      items={items}
      gutter={16}
      minColWidth={220}
      layoutMode="auto"
      animate
      transitionDuration={400}
      className="masonry-grid"
      renderItem={(item) => (
        <div
          style={{
            height: item.height,
            borderRadius: 12,
            padding: 16,
            color: '#fff',
            background: item.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>
            {item.title}
          </h3>
          <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>
            ID: {item.id}
          </p>
        </div>
      )}
    />
  );
}
```

### 2. Server Component with Data (`app/page.tsx`)

```typescript
import MasonryGrid from './components/MasonryGrid';

type Item = {
  id: number;
  title: string;
  height: number;
  color: string;
};

// This can be replaced with actual data fetching
const generateItems = (count: number): Item[] => {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Card ${i + 1}`,
    height: 140 + Math.random() * 160,
    color: colors[i % colors.length],
  }));
};

export default function Home() {
  const items = generateItems(24);

  return (
    <main style={{ padding: 24, background: '#020617', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: '#e5e7eb', marginBottom: 24 }}>
          Masonry Grid with Next.js SSR
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: 32 }}>
          This example demonstrates full SSR support. Items are rendered on the
          server and the masonry layout is initialized on the client.
        </p>
        <MasonryGrid items={items} />
      </div>
    </main>
  );
}
```

### 3. Layout (`app/layout.tsx`)

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Masonry Grid with Next.js SSR',
  description: 'Full SSR support for masonry-snap-grid-layout',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## Running the Example

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What Happens During SSR

1. **Build Time**: Next.js compiles your components
2. **Server Render**: The `MasonryGrid` component renders server-side
   - Items are rendered as regular divs in order
   - No JavaScript runs on the server
   - HTML includes all content (SEO-friendly)
3. **Network Transfer**: HTML is sent to the browser
4. **Browser Hydration**: React hydrates the DOM
   - Component mounts on client
   - `useEffect` detects client environment
   - Masonry layout is initialized
   - Items are repositioned using CSS masonry or JavaScript
5. **User Interaction**: Layout updates on window resize

## Benefits

✅ **SEO Friendly**: All items are server-rendered and crawlable
✅ **Fast Initial Load**: Server sends HTML immediately
✅ **No Layout Shift**: Items are pre-rendered, then enhanced
✅ **Progressive Enhancement**: Works with JavaScript disabled (shows stacked layout)
✅ **Smooth Animations**: GPU-accelerated transforms after hydration

## Troubleshooting

### Hydration Mismatch Warning
This warning may appear if the server renders items in a different order than the client expects. The masonry component handles this by re-initializing after hydration.

### Items Appear Stacked Initially
This is normal! The server renders items stacked, then the client enhances them with masonry layout. The transition is very fast (typically < 100ms).

### Layout Not Updating on Resize
Make sure your container has a defined width:
```typescript
<div style={{ width: '100%' }}>
  <MasonryGrid items={items} />
</div>
```

## Advanced Usage

### With Dynamic Data Fetching

```typescript
// app/page.tsx
async function getItems() {
  const res = await fetch('https://api.example.com/items', {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  });
  return res.json();
}

export default async function Home() {
  const items = await getItems();
  return <MasonryGrid items={items} />;
}
```

### With Dynamic Columns

```typescript
'use client';

import { useState, useEffect } from 'react';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';

export default function ResponsiveGrid({ items }: any) {
  const [minColWidth, setMinColWidth] = useState(220);

  useEffect(() => {
    const handleResize = () => {
      // Adjust minimum column width based on screen size
      if (window.innerWidth < 768) {
        setMinColWidth(150);
      } else if (window.innerWidth < 1024) {
        setMinColWidth(180);
      } else {
        setMinColWidth(220);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <MasonrySnapGrid
      items={items}
      minColWidth={minColWidth}
      gutter={16}
      animate
      transitionDuration={400}
      renderItem={(item) => <YourItemComponent item={item} />}
    />
  );
}
```

## Next Steps

- Check out the main README for full API documentation
- See SSR_GUIDE.md for more SSR patterns
- Explore the examples folder for more use cases

