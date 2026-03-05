import MasonrySnapGridLayout from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

const COLORS = [
  '#fde68a', '#a7f3d0', '#bfdbfe', '#fca5a5',
  '#c4b5fd', '#fdba74', '#6ee7b7', '#93c5fd',
];
const INITIAL_COUNT = 200;

function makeItem(i) {
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

function renderCard(item) {
  const el = document.createElement('div');
  el.className = 'card';
  el.style.background = item.color;
  el.style.height = item.height + 'px';
  el.innerHTML = `<strong>${item.title}</strong><p>${item.body}</p>`;
  return el;
}

const cssSupported = (() => {
  try { return typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry'); }
  catch { return false; }
})();

let items   = Array.from({ length: INITIAL_COUNT }, (_, i) => makeItem(i));
let nextId  = INITIAL_COUNT;
let mode    = 'js';
let animOn  = true;
let masonry = null;

const container = document.getElementById('grid');

function updateBadges() {
  const usingCss = mode === 'auto' && cssSupported;
  const badge = document.getElementById('badge-engine');
  badge.textContent = usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry';
  badge.style.background = usingCss ? '#059669' : '#4f46e5';
  document.getElementById('badge-count').textContent = `${items.length} items`;
}

function rebuild() {
  masonry?.destroy();
  const gutter      = parseInt(document.getElementById('gutter').value, 10);
  const minColWidth = parseInt(document.getElementById('minColWidth').value, 10);
  masonry = new MasonrySnapGridLayout(container, {
    layoutMode: mode,
    gutter,
    minColWidth,
    animate: animOn,
    items,
    renderItem: renderCard,
  });
  updateBadges();
}

// Segmented control helpers
function setSegActive(groupId, attrName, value) {
  document.querySelectorAll(`#${groupId} button`).forEach(b =>
    b.classList.toggle('active', b.dataset[attrName] === String(value))
  );
}

// Controls
document.getElementById('gutter').addEventListener('input', function () {
  document.getElementById('gutter-label').textContent = `Gutter: ${this.value}px`;
  rebuild();
});
document.getElementById('minColWidth').addEventListener('input', function () {
  document.getElementById('col-label').textContent = `Min col: ${this.value}px`;
  rebuild();
});

document.getElementById('mode-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  mode = btn.dataset.mode;
  setSegActive('mode-seg', 'mode', mode);
  rebuild();
});

document.getElementById('animate-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-anim]');
  if (!btn) return;
  animOn = btn.dataset.anim === 'true';
  setSegActive('animate-seg', 'anim', animOn);
  rebuild();
});

document.getElementById('addBtn').addEventListener('click', () => {
  items = [...items, makeItem(nextId++)];
  masonry?.updateItems(items);
  updateBadges();
});

document.getElementById('removeBtn').addEventListener('click', () => {
  if (!items.length) return;
  items = items.slice(0, -1);
  masonry?.updateItems(items);
  updateBadges();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  items  = Array.from({ length: INITIAL_COUNT }, (_, i) => makeItem(i));
  nextId = INITIAL_COUNT;
  rebuild();
});

// Initial render
rebuild();
