import React, { useState } from 'react';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/style.css';

interface Card {
  id: number;
  title: string;
  body: string;
  height: number;
  color: string;
}

const COLORS = [
  '#fde68a', '#a7f3d0', '#bfdbfe', '#fca5a5',
  '#c4b5fd', '#fdba74', '#6ee7b7', '#93c5fd',
];

function makeItem(i: number): Card {
  return {
    id: i,
    title: `Card ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'.slice(
      0, 20 + (i * 7) % 80
    ),
    height: 80 + (i * 37) % 180,
    color: COLORS[i % COLORS.length],
  };
}

const initial = Array.from({ length: 12 }, (_, i) => makeItem(i));

export default function App() {
  const [items, setItems] = useState<Card[]>(initial);
  const [gutter, setGutter] = useState(16);
  const [minColWidth, setMinColWidth] = useState(220);
  const [nextId, setNextId] = useState(initial.length);

  const addItem = () => {
    setItems((prev) => [...prev, makeItem(nextId)]);
    setNextId((n) => n + 1);
  };

  const removeItem = () => setItems((prev) => prev.slice(0, -1));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f5f5', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ marginBottom: 24, fontSize: '1.4rem', color: '#333' }}>
        masonry-snap-grid-layout — React Demo
      </h1>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
        <label style={{ fontSize: '.875rem', color: '#555' }}>
          Gutter: {gutter}px&nbsp;
          <input type="range" min={4} max={40} value={gutter} onChange={(e) => setGutter(+e.target.value)} />
        </label>
        <label style={{ fontSize: '.875rem', color: '#555' }}>
          Min col: {minColWidth}px&nbsp;
          <input type="range" min={100} max={400} value={minColWidth} onChange={(e) => setMinColWidth(+e.target.value)} />
        </label>
        <button onClick={addItem} style={btnStyle}>+ Add item</button>
        <button onClick={removeItem} style={btnStyle}>- Remove item</button>
      </div>

      <MasonrySnapGrid
        items={items}
        layoutMode="js"
        gutter={gutter}
        minColWidth={minColWidth}
        animate
        renderItem={(card) => (
          <div
            style={{
              background: card.color,
              borderRadius: 12,
              padding: 16,
              height: card.height,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: '.875rem',
              color: '#333',
            }}
          >
            <strong>{card.title}</strong>
            <p style={{ color: '#555', lineHeight: 1.5, margin: 0 }}>{card.body}</p>
          </div>
        )}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  background: '#4f46e5',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '.875rem',
};
