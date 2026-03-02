import MasonrySnapGridLayout from 'https://unpkg.com/masonry-snap-grid-layout/dist/index.mjs';

const container = document.getElementById('masonry-container');

const items = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  title: `Card ${i + 1}`,
  color: `hsl(${i * 15}, 80%, 60%)`,
}));

new MasonrySnapGridLayout(container, {
  layoutMode: 'auto',
  gutter: 16,
  minColWidth: 220,
  items,
  renderItem: (item) => {
    const el = document.createElement('div');
    el.style.height = `${140 + Math.random() * 160}px`;
    el.style.borderRadius = '12px';
    el.style.padding = '16px';
    el.style.color = '#0f172a';
    el.style.boxSizing = 'border-box';
    el.style.background = `linear-gradient(135deg,
      ${item.color} 0%,
      hsl(${(item.id + 5) * 15}, 90%, 70%) 100%)`;
    el.innerHTML = `<h3>${item.title}</h3>`;
    return el;
  },
});

