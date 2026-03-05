import React, { useState, useCallback } from 'react';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import 'masonry-snap-grid-layout/style.css';

function cssMasonrySupported() {
  try { return typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry'); }
  catch { return false; }
}

interface Card {
  id: number;
  title: string;
  body: string;
  height: number;
  color: string;
}

type LayoutMode = 'auto' | 'js';

const COLORS = [
  '#fde68a', '#a7f3d0', '#bfdbfe', '#fca5a5',
  '#c4b5fd', '#fdba74', '#6ee7b7', '#93c5fd',
];

function makeItem(i: number): Card {
  return {
    id: i,
    title: `Card ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'.slice(
      0, 20 + (i * 7) % 80,
    ),
    height: 80 + (i * 37) % 180,
    color: COLORS[i % COLORS.length],
  };
}

const INITIAL_COUNT = 500;
const initial = Array.from({ length: INITIAL_COUNT }, (_, i) => makeItem(i));

export default function App() {
  const [items, setItems]           = useState<Card[]>(initial);
  const [gutter, setGutter]         = useState(16);
  const [minColWidth, setMinColWidth] = useState(220);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
  const [virtualize, setVirtualize] = useState(true);
  const [animate, setAnimate]       = useState(true);
  const [overscan, setOverscan]     = useState(300);
  const [nextId, setNextId]         = useState(INITIAL_COUNT);

  const addItem = () => {
    setItems(prev => [...prev, makeItem(nextId)]);
    setNextId(n => n + 1);
  };
  const removeItem = () => setItems(prev => prev.slice(0, -1));
  const resetItems = () => {
    setItems(Array.from({ length: INITIAL_COUNT }, (_, i) => makeItem(i)));
    setNextId(INITIAL_COUNT);
  };

  // Which engine will actually run (reflects what the component uses)
  const cssSupported = cssMasonrySupported();
  const usingCss = layoutMode === 'auto' && cssSupported;

  const renderItem = useCallback((card: Card) => (
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
  ), []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f5f5', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ marginBottom: 8, fontSize: '1.4rem', color: '#333' }}>
        masonry-snap-grid-layout — React Demo
      </h1>

      {/* Engine / status badge */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Badge color={usingCss ? '#059669' : '#4f46e5'}>
          Engine: {usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry'}
        </Badge>
        <Badge color="#6b7280">
          {items.length} items
        </Badge>
        {virtualize && !usingCss && (
          <Badge color="#d97706">
            ⚡ Virtualization on (overscan {overscan}px)
          </Badge>
        )}
        {!cssSupported && (
          <Badge color="#9ca3af">
            CSS masonry not supported in this browser
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24, padding: 16, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>

        <ControlGroup label="Layout mode">
          <SegmentedControl
            options={[
              { value: 'auto', label: 'auto (detect CSS masonry)' },
              { value: 'js',   label: 'js (always JS)' },
            ]}
            value={layoutMode}
            onChange={v => setLayoutMode(v as LayoutMode)}
          />
        </ControlGroup>

        <ControlGroup label={`Gutter: ${gutter}px`}>
          <input type="range" min={0} max={40} value={gutter} onChange={e => setGutter(+e.target.value)} />
        </ControlGroup>

        <ControlGroup label={`Min col: ${minColWidth}px`}>
          <input type="range" min={100} max={400} value={minColWidth} onChange={e => setMinColWidth(+e.target.value)} />
        </ControlGroup>

        <ControlGroup label="Virtualize (JS mode only)">
          <Toggle checked={virtualize} onChange={setVirtualize} />
        </ControlGroup>

        {virtualize && !usingCss && (
          <ControlGroup label={`Overscan: ${overscan}px`}>
            <input type="range" min={0} max={800} step={50} value={overscan} onChange={e => setOverscan(+e.target.value)} />
          </ControlGroup>
        )}

        <ControlGroup label="Animate">
          <Toggle checked={animate} onChange={setAnimate} />
        </ControlGroup>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={addItem}  style={btn('#4f46e5')}>+ Add</button>
          <button onClick={removeItem} style={btn('#6b7280')}>− Remove</button>
          <button onClick={resetItems} style={btn('#9ca3af')}>↺ Reset</button>
        </div>
      </div>

      <MasonrySnapGrid
        items={items}
        layoutMode={layoutMode}
        gutter={gutter}
        minColWidth={minColWidth}
        animate={animate}
        virtualize={virtualize}
        overscan={overscan}
        renderItem={renderItem}
      />
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ padding: '4px 10px', borderRadius: 99, background: color, color: '#fff', fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.8rem', color: '#555', whiteSpace: 'nowrap' }}>
      {label}
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        padding: '4px 12px', border: 'none', borderRadius: 99, cursor: 'pointer',
        background: checked ? '#4f46e5' : '#d1d5db', color: checked ? '#fff' : '#374151',
        fontSize: '.8rem', fontWeight: 600, transition: 'background .2s',
      }}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  );
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
            background: value === o.value ? '#4f46e5' : '#e5e7eb',
            color: value === o.value ? '#fff' : '#374151',
            fontSize: '.75rem', fontWeight: 600,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return { padding: '8px 14px', border: 'none', borderRadius: 6, background: bg, color: '#fff', cursor: 'pointer', fontSize: '.875rem' };
}
