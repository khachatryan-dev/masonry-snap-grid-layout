import React, { useCallback, useMemo, useRef, useState } from 'react';
import MasonrySnapGrid from 'masonry-snap-grid-layout/react';
import type { LayoutInfo } from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

function cssMasonrySupported() {
  try {
    return (
      typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry')
    );
  } catch {
    return false;
  }
}

interface Card {
  id: number;
  title: string;
  body: string;
  height: number;
  color: string;
}

type LayoutMode = 'auto' | 'js';
type ColumnMode = 'minWidth' | 'fixed' | 'responsive';
type Content = 'text' | 'images';
type ScrollMode = 'page' | 'panel';

const COLORS = [
  '#fde68a',
  '#a7f3d0',
  '#bfdbfe',
  '#fca5a5',
  '#c4b5fd',
  '#fdba74',
  '#6ee7b7',
  '#93c5fd',
];

function makeItem(i: number): Card {
  return {
    id: i,
    title: `Card ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'.slice(
      0,
      20 + ((i * 7) % 80)
    ),
    height: 80 + ((i * 37) % 180),
    color: COLORS[i % COLORS.length],
  };
}

const INITIAL_COUNT = 500;
const makeItems = (n: number) => Array.from({ length: n }, (_, i) => makeItem(i));

/** Breakpoint map keyed on minimum *container* width, mobile-first. */
const RESPONSIVE_COLUMNS = { 0: 1, 520: 2, 900: 3, 1280: 4, 1600: 5 };

export default function App() {
  const [items, setItems] = useState<Card[]>(() => makeItems(INITIAL_COUNT));
  const [gutter, setGutter] = useState(16);
  const [minColWidth, setMinColWidth] = useState(220);
  const [columnMode, setColumnMode] = useState<ColumnMode>('minWidth');
  const [fixedColumns, setFixedColumns] = useState(3);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
  const [virtualize, setVirtualize] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [overscan, setOverscan] = useState(300);
  const [useEstimate, setUseEstimate] = useState(false);
  const [content, setContent] = useState<Content>('text');
  const [scrollMode, setScrollMode] = useState<ScrollMode>('page');
  const [layout, setLayout] = useState<LayoutInfo | null>(null);
  const [nextId, setNextId] = useState(INITIAL_COUNT);

  const panelRef = useRef<HTMLDivElement>(null);

  const addItem = () => {
    setItems((prev) => [...prev, makeItem(nextId)]);
    setNextId((n) => n + 1);
  };
  const removeItem = () => setItems((prev) => prev.slice(0, -1));
  const resetItems = () => {
    setItems(makeItems(INITIAL_COUNT));
    setNextId(INITIAL_COUNT);
  };

  /**
   * Prepend and shuffle exist to show `getItemKey` doing its job. With
   * index-based keys, both operations would hand each DOM node to a different
   * item — and hand it that item's stale cached height with it.
   */
  const prependItem = () => {
    setItems((prev) => [makeItem(nextId), ...prev]);
    setNextId((n) => n + 1);
  };
  const shuffleItems = () =>
    setItems((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });

  const cssSupported = cssMasonrySupported();
  const usingCss = layoutMode === 'auto' && cssSupported;

  /** Undefined means "derive the count from minColWidth". */
  const columns =
    columnMode === 'fixed'
      ? fixedColumns
      : columnMode === 'responsive'
        ? RESPONSIVE_COLUMNS
        : undefined;

  const renderItem = useCallback(
    (card: Card, index: number) => {
      if (content === 'images') {
        // Deliberately no width/height attributes: the browser cannot reserve
        // space, so the first measurement happens against a zero-height image.
        // Self-healing is what corrects the layout once each one decodes.
        const h = 140 + ((card.id * 53) % 220);
        return (
          <figure
            style={{
              margin: 0,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#e5e7eb',
              boxShadow: '0 1px 4px rgba(0,0,0,.10)',
            }}
          >
            <img
              src={`https://picsum.photos/seed/msgl-${card.id}/400/${h}`}
              alt={`Placeholder ${card.id}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <figcaption
              style={{ padding: '8px 12px', fontSize: '.75rem', color: '#555' }}
            >
              #{index} · {card.title}
            </figcaption>
          </figure>
        );
      }

      return (
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
      );
    },
    [content]
  );

  /**
   * Guarded so an unchanged layout does not trigger a pointless re-render —
   * `onLayout` fires on every pass, including ones that changed nothing.
   */
  const handleLayout = useCallback((info: LayoutInfo) => {
    setLayout((prev) =>
      prev &&
      prev.columnCount === info.columnCount &&
      prev.columnWidth === info.columnWidth &&
      prev.containerHeight === info.containerHeight &&
      prev.itemCount === info.itemCount &&
      prev.engine === info.engine
        ? prev
        : info
    );
  }, []);

  const grid = (
    <MasonrySnapGrid
      items={items}
      layoutMode={layoutMode}
      gutter={gutter}
      minColWidth={minColWidth}
      columns={columns}
      animate={animate}
      virtualize={virtualize}
      overscan={overscan}
      estimatedItemHeight={useEstimate ? 220 : undefined}
      scrollContainer={scrollMode === 'panel' ? panelRef : undefined}
      getItemKey={(card) => card.id}
      onLayout={handleLayout}
      renderItem={renderItem}
    />
  );

  const columnSummary = useMemo(() => {
    if (columnMode === 'fixed') return `columns={${fixedColumns}}`;
    if (columnMode === 'responsive') return 'columns={{ 0:1, 520:2, 900:3, … }}';
    return `minColWidth={${minColWidth}}`;
  }, [columnMode, fixedColumns, minColWidth]);

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        background: '#f5f5f5',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <h1 style={{ marginBottom: 8, fontSize: '1.4rem', color: '#333' }}>
        masonry-snap-grid-layout — React Demo
      </h1>

      {/* Engine / status badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Badge color={usingCss ? '#059669' : '#4f46e5'}>
          Engine: {usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry'}
        </Badge>
        <Badge color="#6b7280">{items.length} items</Badge>
        <Badge color="#374151">{columnSummary}</Badge>
        {layout && (
          <Badge color="#0f766e">
            {layout.columnCount} cols × {Math.round(layout.columnWidth)}px ·{' '}
            {Math.round(layout.containerHeight)}px tall
          </Badge>
        )}
        {virtualize && !usingCss && (
          <Badge color="#d97706">
            ⚡ Virtualized (overscan {overscan}px
            {useEstimate ? ', estimated heights' : ''})
          </Badge>
        )}
        {scrollMode === 'panel' && !usingCss && (
          <Badge color="#7c3aed">▤ Scrolling inside a panel</Badge>
        )}
        {content === 'images' && (
          <Badge color="#be185d">
            🖼 Images with no width/height — watch it self-heal
          </Badge>
        )}
        {!cssSupported && (
          <Badge color="#9ca3af">CSS masonry not supported in this browser</Badge>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 24,
          padding: 16,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,.08)',
        }}
      >
        <ControlGroup label="Layout mode">
          <SegmentedControl
            options={[
              { value: 'auto', label: 'auto' },
              { value: 'js', label: 'js' },
            ]}
            value={layoutMode}
            onChange={(v) => setLayoutMode(v as LayoutMode)}
          />
        </ControlGroup>

        <ControlGroup label="Content">
          <SegmentedControl
            options={[
              { value: 'text', label: 'text' },
              { value: 'images', label: 'images' },
            ]}
            value={content}
            onChange={(v) => setContent(v as Content)}
          />
        </ControlGroup>

        <ControlGroup label="Columns">
          <SegmentedControl
            options={[
              { value: 'minWidth', label: 'min width' },
              { value: 'fixed', label: 'fixed' },
              { value: 'responsive', label: 'breakpoints' },
            ]}
            value={columnMode}
            onChange={(v) => setColumnMode(v as ColumnMode)}
          />
        </ControlGroup>

        {columnMode === 'fixed' && (
          <ControlGroup label={`Fixed columns: ${fixedColumns}`}>
            <input
              type="range"
              min={1}
              max={6}
              value={fixedColumns}
              onChange={(e) => setFixedColumns(+e.target.value)}
            />
          </ControlGroup>
        )}

        {columnMode === 'minWidth' && (
          <ControlGroup label={`Min col: ${minColWidth}px`}>
            <input
              type="range"
              min={100}
              max={400}
              value={minColWidth}
              onChange={(e) => setMinColWidth(+e.target.value)}
            />
          </ControlGroup>
        )}

        <ControlGroup label={`Gutter: ${gutter}px`}>
          <input
            type="range"
            min={0}
            max={40}
            value={gutter}
            onChange={(e) => setGutter(+e.target.value)}
          />
        </ControlGroup>

        <ControlGroup label="Scroll container">
          <SegmentedControl
            options={[
              { value: 'page', label: 'page' },
              { value: 'panel', label: 'panel' },
            ]}
            value={scrollMode}
            onChange={(v) => setScrollMode(v as ScrollMode)}
          />
        </ControlGroup>

        <ControlGroup label="Virtualize (JS mode only)">
          <Toggle checked={virtualize} onChange={setVirtualize} />
        </ControlGroup>

        {virtualize && !usingCss && (
          <ControlGroup label={`Overscan: ${overscan}px`}>
            <input
              type="range"
              min={0}
              max={800}
              step={50}
              value={overscan}
              onChange={(e) => setOverscan(+e.target.value)}
            />
          </ControlGroup>
        )}

        {virtualize && !usingCss && (
          <ControlGroup label="Estimated heights">
            <Toggle checked={useEstimate} onChange={setUseEstimate} />
          </ControlGroup>
        )}

        <ControlGroup label="Animate">
          <Toggle checked={animate} onChange={setAnimate} />
        </ControlGroup>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={addItem} style={btn('#4f46e5')}>
            + Append
          </button>
          <button onClick={prependItem} style={btn('#0f766e')}>
            ↑ Prepend
          </button>
          <button onClick={shuffleItems} style={btn('#7c3aed')}>
            ⇄ Shuffle
          </button>
          <button onClick={removeItem} style={btn('#6b7280')}>
            − Remove
          </button>
          <button onClick={resetItems} style={btn('#9ca3af')}>
            ↺ Reset
          </button>
        </div>
      </div>

      <p style={{ fontSize: '.8rem', color: '#666', margin: '0 0 16px' }}>
        <strong>Prepend</strong> and <strong>Shuffle</strong> demonstrate{' '}
        <code>getItemKey</code>: cards keep their own heights and content because
        identity travels with the data, not the position. Switch{' '}
        <strong>Content</strong> to <em>images</em> to watch the grid re-pack itself
        as each image decodes.
      </p>

      {scrollMode === 'panel' ? (
        <div
          ref={panelRef}
          style={{
            height: '70vh',
            overflow: 'auto',
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            boxShadow: 'inset 0 0 0 1px #e5e7eb',
          }}
        >
          {grid}
        </div>
      ) : (
        grid
      )}
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 99,
        background: color,
        color: '#fff',
        fontSize: '.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: '.8rem',
        color: '#555',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        padding: '4px 12px',
        border: 'none',
        borderRadius: 99,
        cursor: 'pointer',
        background: checked ? '#4f46e5' : '#d1d5db',
        color: checked ? '#fff' : '#374151',
        fontSize: '.8rem',
        fontWeight: 600,
        transition: 'background .2s',
      }}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '4px 10px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            background: value === o.value ? '#4f46e5' : '#e5e7eb',
            color: value === o.value ? '#fff' : '#374151',
            fontSize: '.75rem',
            fontWeight: 600,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    padding: '8px 14px',
    border: 'none',
    borderRadius: 6,
    background: bg,
    color: '#fff',
    cursor: 'pointer',
    fontSize: '.875rem',
  };
}
