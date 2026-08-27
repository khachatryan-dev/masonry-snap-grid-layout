import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

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
const INITIAL_COUNT = 1200;

/** Breakpoint map keyed on minimum *container* width, mobile-first. */
const RESPONSIVE_COLUMNS = { 0: 1, 520: 2, 900: 3, 1280: 4, 1600: 5 };

function makeItem(i) {
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

const makeItems = (n) => Array.from({ length: n }, (_, i) => makeItem(i));

function renderTextCard(item) {
  const el = document.createElement('div');
  el.className = 'card';
  el.style.background = item.color;
  el.style.height = `${item.height}px`;

  const title = document.createElement('strong');
  title.textContent = item.title;
  const body = document.createElement('p');
  body.textContent = item.body;
  el.append(title, body);
  return el;
}

function renderPhotoCard(item, index) {
  // Deliberately no width/height attributes: the browser cannot reserve space,
  // so the first measurement happens against a zero-height image. Self-healing
  // is what corrects the layout once each one decodes.
  const h = 140 + ((item.id * 53) % 220);
  const figure = document.createElement('figure');
  figure.className = 'photo';

  const img = document.createElement('img');
  img.src = `https://picsum.photos/seed/msgl-${item.id}/400/${h}`;
  img.alt = `Placeholder ${item.id}`;

  const caption = document.createElement('figcaption');
  caption.textContent = `#${index} · ${item.title}`;

  figure.append(img, caption);
  return figure;
}

/**
 * Two distinct renderers, selected by reference.
 *
 * A single renderer that branched on `state.content` would keep the same
 * function identity, and `setOptions` only rebuilds elements when the renderer
 * reference actually changes — so the toggle would silently do nothing.
 */
function currentRenderer() {
  return state.content === 'images' ? renderPhotoCard : renderTextCard;
}

const cssSupported = (() => {
  try {
    return (
      typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry')
    );
  } catch {
    return false;
  }
})();

const state = {
  items: makeItems(INITIAL_COUNT),
  nextId: INITIAL_COUNT,
  mode: 'js',
  animate: true,
  content: 'text',
  columnMode: 'minWidth',
  fixedColumns: 3,
  lastLayout: null,
};

const $ = (id) => document.getElementById(id);
const container = $('grid');

/** Undefined means "derive the count from minColWidth". */
function currentColumns() {
  if (state.columnMode === 'fixed') return state.fixedColumns;
  if (state.columnMode === 'responsive') return RESPONSIVE_COLUMNS;
  return undefined;
}

function columnSummary() {
  if (state.columnMode === 'fixed') return `columns: ${state.fixedColumns}`;
  if (state.columnMode === 'responsive') return 'columns: { 0:1, 520:2, 900:3, … }';
  return `minColWidth: ${$('minColWidth').value}px`;
}

function updateBadges() {
  const usingCss = state.mode === 'auto' && cssSupported;

  const engine = $('badge-engine');
  engine.textContent = usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry';
  engine.style.background = usingCss ? '#059669' : '#4f46e5';

  $('badge-count').textContent = `${state.items.length} items`;
  $('badge-columns').textContent = columnSummary();
  $('badge-images').style.display = state.content === 'images' ? '' : 'none';

  const layout = state.lastLayout;
  $('badge-layout').textContent = layout
    ? `${layout.columnCount} cols × ${Math.round(layout.columnWidth)}px · ${Math.round(layout.containerHeight)}px tall`
    : '';
}

const masonry = new MasonrySnapGridLayout(container, {
  layoutMode: state.mode,
  gutter: Number($('gutter').value),
  minColWidth: Number($('minColWidth').value),
  animate: state.animate,
  items: state.items,
  // Stable identity, so updateItems() reuses existing elements instead of
  // clearing the container and rebuilding every card.
  getItemKey: (item) => item.id,
  renderItem: currentRenderer(),
  onLayout: (info) => {
    state.lastLayout = info;
    updateBadges();
  },
});

/**
 * Push the current control values into the live instance.
 * `setOptions` re-lays out in place — no destroy, no rebuild, no lost scroll
 * position.
 */
function applyOptions() {
  masonry.setOptions({
    layoutMode: state.mode,
    gutter: Number($('gutter').value),
    minColWidth: Number($('minColWidth').value),
    columns: currentColumns(),
    animate: state.animate,
  });
  updateBadges();
}

function setItems(next) {
  state.items = next;
  masonry.updateItems(state.items);
  updateBadges();
}

// ── Segmented control helper ──────────────────────────────────────────────────
function setSegActive(groupId, attrName, value) {
  document
    .querySelectorAll(`#${groupId} button`)
    .forEach((b) =>
      b.classList.toggle('active', b.dataset[attrName] === String(value))
    );
}

// ── Controls ──────────────────────────────────────────────────────────────────
$('gutter').addEventListener('input', function () {
  $('gutter-label').textContent = `Gutter: ${this.value}px`;
  applyOptions();
});

$('minColWidth').addEventListener('input', function () {
  $('col-label').textContent = `Min col: ${this.value}px`;
  applyOptions();
});

$('fixedColumns').addEventListener('input', function () {
  state.fixedColumns = Number(this.value);
  $('fixed-label').textContent = `Fixed columns: ${this.value}`;
  applyOptions();
});

$('mode-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  state.mode = btn.dataset.mode;
  setSegActive('mode-seg', 'mode', state.mode);
  applyOptions();
});

$('animate-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-anim]');
  if (!btn) return;
  state.animate = btn.dataset.anim === 'true';
  setSegActive('animate-seg', 'anim', state.animate);
  applyOptions();
});

$('columns-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-colmode]');
  if (!btn) return;
  state.columnMode = btn.dataset.colmode;
  setSegActive('columns-seg', 'colmode', state.columnMode);
  $('fixed-wrap').style.display = state.columnMode === 'fixed' ? '' : 'none';
  $('mincol-wrap').style.display = state.columnMode === 'minWidth' ? '' : 'none';
  applyOptions();
});

$('content-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-content]');
  if (!btn) return;
  state.content = btn.dataset.content;
  setSegActive('content-seg', 'content', state.content);
  // A different renderer reference is what makes setOptions rebuild the
  // elements for the new content type.
  masonry.setOptions({ renderItem: currentRenderer() });
  updateBadges();
});

// ── Item actions ──────────────────────────────────────────────────────────────
$('addBtn').addEventListener('click', () => {
  setItems([...state.items, makeItem(state.nextId++)]);
});

$('prependBtn').addEventListener('click', () => {
  setItems([makeItem(state.nextId++), ...state.items]);
});

$('shuffleBtn').addEventListener('click', () => {
  const next = [...state.items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  setItems(next);
});

$('removeBtn').addEventListener('click', () => {
  if (!state.items.length) return;
  setItems(state.items.slice(0, -1));
});

$('resetBtn').addEventListener('click', () => {
  state.nextId = INITIAL_COUNT;
  setItems(makeItems(INITIAL_COUNT));
});

updateBadges();
