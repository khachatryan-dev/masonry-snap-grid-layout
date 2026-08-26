<script setup lang="ts">
import { computed, ref } from 'vue';
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import type { LayoutInfo } from 'masonry-snap-grid-layout';
import 'masonry-snap-grid-layout/style.css';

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

function cssMasonrySupported(): boolean {
  try {
    return (
      typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry')
    );
  } catch {
    return false;
  }
}

const INITIAL_COUNT = 500;
const makeItems = (n: number) => Array.from({ length: n }, (_, i) => makeItem(i));

/** Breakpoint map keyed on minimum *container* width, mobile-first. */
const RESPONSIVE_COLUMNS = { 0: 1, 520: 2, 900: 3, 1280: 4, 1600: 5 };

const items = ref<Card[]>(makeItems(INITIAL_COUNT));
const gutter = ref(16);
const minColWidth = ref(220);
const columnMode = ref<ColumnMode>('minWidth');
const fixedColumns = ref(3);
const layoutMode = ref<LayoutMode>('auto');
const virtualize = ref(true);
const animate = ref(true);
const overscan = ref(300);
const useEstimate = ref(false);
const content = ref<Content>('text');
const scrollMode = ref<ScrollMode>('page');
const layout = ref<LayoutInfo | null>(null);
const panel = ref<HTMLDivElement | null>(null);
let nextId = INITIAL_COUNT;

const cssSupported = cssMasonrySupported();
const usingCss = computed(() => layoutMode.value === 'auto' && cssSupported);

/** Undefined means "derive the count from minColWidth". */
const columns = computed(() => {
  if (columnMode.value === 'fixed') return fixedColumns.value;
  if (columnMode.value === 'responsive') return RESPONSIVE_COLUMNS;
  return undefined;
});

const columnSummary = computed(() => {
  if (columnMode.value === 'fixed') return `columns="${fixedColumns.value}"`;
  if (columnMode.value === 'responsive')
    return 'columns="{ 0:1, 520:2, 900:3, … }"';
  return `min-col-width="${minColWidth.value}"`;
});

/** Only track the panel element while it is actually the scrolling viewport. */
const scrollContainer = computed(() =>
  scrollMode.value === 'panel' ? panel.value : undefined
);

const getItemKey = (item: Card) => item.id;

function addItem() {
  items.value = [...items.value, makeItem(nextId++)];
}
function removeItem() {
  items.value = items.value.slice(0, -1);
}
function resetItems() {
  items.value = makeItems(INITIAL_COUNT);
  nextId = INITIAL_COUNT;
}

/**
 * Prepend and shuffle exist to show `get-item-key` doing its job. With
 * index-based keys, both would hand each DOM node to a different item — and
 * hand it that item's stale cached height with it.
 */
function prependItem() {
  items.value = [makeItem(nextId++), ...items.value];
}
function shuffleItems() {
  const next = [...items.value];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  items.value = next;
}

function imageSrc(card: Card): string {
  // Deliberately no width/height: the browser cannot reserve space, so the
  // first measurement happens against a zero-height image. Self-healing is
  // what corrects the layout once each one decodes.
  const h = 140 + ((card.id * 53) % 220);
  return `https://picsum.photos/seed/msgl-${card.id}/400/${h}`;
}

function onLayout(info: LayoutInfo) {
  layout.value = info;
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const FIELD =
  'display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;white-space:nowrap';

function badge(bg: string) {
  return `padding:4px 10px;border-radius:99px;background:${bg};color:#fff;font-size:.75rem;font-weight:600;white-space:nowrap`;
}
function segBtn(active: boolean) {
  return `padding:4px 10px;border:none;border-radius:6px;cursor:pointer;font-size:.75rem;font-weight:600;background:${active ? '#4f46e5' : '#e5e7eb'};color:${active ? '#fff' : '#374151'}`;
}
function toggleBtn(active: boolean) {
  return `padding:4px 12px;border:none;border-radius:99px;cursor:pointer;font-size:.8rem;font-weight:600;background:${active ? '#4f46e5' : '#d1d5db'};color:${active ? '#fff' : '#374151'}`;
}
function actionBtn(bg: string) {
  return `padding:8px 14px;border:none;border-radius:6px;background:${bg};color:#fff;cursor:pointer;font-size:.875rem`;
}

const cardShell =
  'margin:0;border-radius:12px;overflow:hidden;background:#e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.10)';

function textCard(item: Card) {
  return `background:${item.color};border-radius:12px;padding:16px;height:${item.height}px;display:flex;flex-direction:column;gap:8px;font-size:.875rem;color:#333`;
}
</script>

<template>
  <div
    style="
      font-family: system-ui, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 24px;
    "
  >
    <h1 style="margin-bottom: 8px; font-size: 1.4rem; color: #333">
      masonry-snap-grid-layout — Vue 3 Demo
    </h1>

    <!-- Engine / status badges -->
    <div
      style="
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        align-items: center;
      "
    >
      <span :style="badge(usingCss ? '#059669' : '#4f46e5')">
        Engine: {{ usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry' }}
      </span>
      <span :style="badge('#6b7280')">{{ items.length }} items</span>
      <span :style="badge('#374151')">{{ columnSummary }}</span>
      <span v-if="layout" :style="badge('#0f766e')">
        {{ layout.columnCount }} cols × {{ Math.round(layout.columnWidth) }}px ·
        {{ Math.round(layout.containerHeight) }}px tall
      </span>
      <span v-if="virtualize && !usingCss" :style="badge('#d97706')">
        ⚡ Virtualized (overscan {{ overscan }}px{{
          useEstimate ? ', estimated heights' : ''
        }})
      </span>
      <span v-if="scrollMode === 'panel' && !usingCss" :style="badge('#7c3aed')">
        ▤ Scrolling inside a panel
      </span>
      <span v-if="content === 'images'" :style="badge('#be185d')">
        🖼 Images with no width/height — watch it self-heal
      </span>
      <span v-if="!cssSupported" :style="badge('#9ca3af')">
        CSS masonry not supported in this browser
      </span>
    </div>

    <!-- Controls -->
    <div
      style="
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        align-items: flex-end;
        margin-bottom: 24px;
        padding: 16px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      "
    >
      <label :style="FIELD">
        Layout mode
        <div style="display: flex; gap: 4px">
          <button
            v-for="opt in ['auto', 'js']"
            :key="opt"
            @click="layoutMode = opt as LayoutMode"
            :style="segBtn(layoutMode === opt)"
          >
            {{ opt }}
          </button>
        </div>
      </label>

      <label :style="FIELD">
        Content
        <div style="display: flex; gap: 4px">
          <button
            v-for="opt in ['text', 'images']"
            :key="opt"
            @click="content = opt as Content"
            :style="segBtn(content === opt)"
          >
            {{ opt }}
          </button>
        </div>
      </label>

      <label :style="FIELD">
        Columns
        <div style="display: flex; gap: 4px">
          <button
            v-for="opt in [
              { v: 'minWidth', l: 'min width' },
              { v: 'fixed', l: 'fixed' },
              { v: 'responsive', l: 'breakpoints' },
            ]"
            :key="opt.v"
            @click="columnMode = opt.v as ColumnMode"
            :style="segBtn(columnMode === opt.v)"
          >
            {{ opt.l }}
          </button>
        </div>
      </label>

      <label v-if="columnMode === 'fixed'" :style="FIELD">
        Fixed columns: {{ fixedColumns }}
        <input type="range" min="1" max="6" v-model.number="fixedColumns" />
      </label>

      <label v-if="columnMode === 'minWidth'" :style="FIELD">
        Min col: {{ minColWidth }}px
        <input type="range" min="100" max="400" v-model.number="minColWidth" />
      </label>

      <label :style="FIELD">
        Gutter: {{ gutter }}px
        <input type="range" min="0" max="40" v-model.number="gutter" />
      </label>

      <label :style="FIELD">
        Scroll container
        <div style="display: flex; gap: 4px">
          <button
            v-for="opt in ['page', 'panel']"
            :key="opt"
            @click="scrollMode = opt as ScrollMode"
            :style="segBtn(scrollMode === opt)"
          >
            {{ opt }}
          </button>
        </div>
      </label>

      <label :style="FIELD">
        Virtualize (JS only)
        <button @click="virtualize = !virtualize" :style="toggleBtn(virtualize)">
          {{ virtualize ? 'ON' : 'OFF' }}
        </button>
      </label>

      <label v-if="virtualize && !usingCss" :style="FIELD">
        Overscan: {{ overscan }}px
        <input type="range" min="0" max="800" step="50" v-model.number="overscan" />
      </label>

      <label v-if="virtualize && !usingCss" :style="FIELD">
        Estimated heights
        <button @click="useEstimate = !useEstimate" :style="toggleBtn(useEstimate)">
          {{ useEstimate ? 'ON' : 'OFF' }}
        </button>
      </label>

      <label :style="FIELD">
        Animate
        <button @click="animate = !animate" :style="toggleBtn(animate)">
          {{ animate ? 'ON' : 'OFF' }}
        </button>
      </label>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; padding-bottom: 2px">
        <button @click="addItem" :style="actionBtn('#4f46e5')">+ Append</button>
        <button @click="prependItem" :style="actionBtn('#0f766e')">
          ↑ Prepend
        </button>
        <button @click="shuffleItems" :style="actionBtn('#7c3aed')">
          ⇄ Shuffle
        </button>
        <button @click="removeItem" :style="actionBtn('#6b7280')">− Remove</button>
        <button @click="resetItems" :style="actionBtn('#9ca3af')">↺ Reset</button>
      </div>
    </div>

    <p style="font-size: 0.8rem; color: #666; margin: 0 0 16px">
      <strong>Prepend</strong> and <strong>Shuffle</strong> demonstrate
      <code>get-item-key</code>: cards keep their own heights and content because
      identity travels with the data, not the position. Switch
      <strong>Content</strong> to <em>images</em> to watch the grid re-pack itself
      as each image decodes.
    </p>

    <!-- Scrollable panel: the grid virtualizes against this element -->
    <div
      v-if="scrollMode === 'panel'"
      ref="panel"
      style="
        height: 70vh;
        overflow: auto;
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: inset 0 0 0 1px #e5e7eb;
      "
    >
      <MasonrySnapGrid
        :items="items"
        :layout-mode="layoutMode"
        :gutter="gutter"
        :min-col-width="minColWidth"
        :columns="columns"
        :animate="animate"
        :virtualize="virtualize"
        :overscan="overscan"
        :estimated-item-height="useEstimate ? 220 : undefined"
        :scroll-container="scrollContainer"
        :get-item-key="getItemKey"
        @layout="onLayout"
      >
        <template #default="{ item, index }">
          <figure v-if="content === 'images'" :style="cardShell">
            <img
              :src="imageSrc(item)"
              :alt="`Placeholder ${item.id}`"
              style="width: 100%; height: auto; display: block"
            />
            <figcaption style="padding: 8px 12px; font-size: 0.75rem; color: #555">
              #{{ index }} · {{ item.title }}
            </figcaption>
          </figure>
          <div v-else :style="textCard(item)">
            <strong>{{ item.title }}</strong>
            <p style="color: #555; line-height: 1.5; margin: 0">{{ item.body }}</p>
          </div>
        </template>
      </MasonrySnapGrid>
    </div>

    <!-- Page scrolling -->
    <MasonrySnapGrid
      v-else
      :items="items"
      :layout-mode="layoutMode"
      :gutter="gutter"
      :min-col-width="minColWidth"
      :columns="columns"
      :animate="animate"
      :virtualize="virtualize"
      :overscan="overscan"
      :estimated-item-height="useEstimate ? 220 : undefined"
      :get-item-key="getItemKey"
      @layout="onLayout"
    >
      <template #default="{ item, index }">
        <figure v-if="content === 'images'" :style="cardShell">
          <img
            :src="imageSrc(item)"
            :alt="`Placeholder ${item.id}`"
            style="width: 100%; height: auto; display: block"
          />
          <figcaption style="padding: 8px 12px; font-size: 0.75rem; color: #555">
            #{{ index }} · {{ item.title }}
          </figcaption>
        </figure>
        <div v-else :style="textCard(item)">
          <strong>{{ item.title }}</strong>
          <p style="color: #555; line-height: 1.5; margin: 0">{{ item.body }}</p>
        </div>
      </template>
    </MasonrySnapGrid>
  </div>
</template>
