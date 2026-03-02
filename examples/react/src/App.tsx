import React from 'react';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/dist/index.css';

type Item = {
  id: number;
  title: string;
  height: number;
};

const items: Item[] = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  title: `Card ${i + 1}`,
  height: 140 + Math.random() * 160,
}));

export default function App() {
  return (
    <div style={{ padding: 24, background: '#020617', minHeight: '100vh', color: '#e5e7eb' }}>
      <h1>React – MasonrySnapGridLayout</h1>
      <MasonrySnapGrid<Item>
        items={items}
        gutter={16}
        minColWidth={220}
        layoutMode="auto"
        animate
        transitionDuration={400}
        renderItem={(item) => (
          <div
            style={{
              height: item.height,
              borderRadius: 12,
              padding: 16,
              color: '#0f172a',
              background: `linear-gradient(135deg,
                hsl(${item.id * 18}, 80%, 60%) 0%,
                hsl(${item.id * 18 + 40}, 90%, 70%) 100%)`,
            }}
          >
            <h3>{item.title}</h3>
          </div>
        )}
      />
    </div>
  );
}

