<script setup lang="ts">
import { ref, computed } from 'vue';
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import 'masonry-snap-grid-layout/style.css';

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

function cssMasonrySupported(): boolean {
  try { return typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry'); }
  catch { return false; }
}

const INITIAL_COUNT = 500;

const items       = ref<Card[]>(Array.from({ length: INITIAL_COUNT }, (_, i) => makeItem(i)));
const gutter      = ref(16);
const minColWidth = ref(220);
const layoutMode  = ref<LayoutMode>('auto');
const virtualize  = ref(true);
const animate     = ref(true);
const overscan    = ref(300);
let nextId        = INITIAL_COUNT;

const cssSupported = cssMasonrySupported();
const usingCss = computed(() => layoutMode.value === 'auto' && cssSupported);

function addItem() {
  items.value = [...items.value, makeItem(nextId++)];
}
function removeItem() {
  items.value = items.value.slice(0, -1);
}
function resetItems() {
  items.value = Array.from({ length: INITIAL_COUNT }, (_, i) => makeItem(i));
  nextId = INITIAL_COUNT;
}
</script>

<template>
  <div style="font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; padding: 24px;">
    <h1 style="margin-bottom: 8px; font-size: 1.4rem; color: #333;">
      masonry-snap-grid-layout — Vue 3 Demo
    </h1>

    <!-- Engine / status badges -->
    <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;">
      <span :style="badge(usingCss ? '#059669' : '#4f46e5')">
        Engine: {{ usingCss ? '✦ Native CSS masonry' : '⚙ JS masonry' }}
      </span>
      <span :style="badge('#6b7280')">{{ items.length }} items</span>
      <span v-if="virtualize && !usingCss" :style="badge('#d97706')">
        ⚡ Virtualization on (overscan {{ overscan }}px)
      </span>
      <span v-if="!cssSupported" :style="badge('#9ca3af')">
        CSS masonry not supported in this browser
      </span>
    </div>

    <!-- Controls -->
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 24px; padding: 16px; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08);">

      <label style="display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;">
        Layout mode
        <div style="display:flex;gap:4px;">
          <button
            v-for="opt in ['auto','js']"
            :key="opt"
            @click="layoutMode = opt as LayoutMode"
            :style="segBtn(layoutMode === opt)"
          >{{ opt === 'auto' ? 'auto (detect CSS)' : 'js (always JS)' }}</button>
        </div>
      </label>

      <label style="display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;">
        Gutter: {{ gutter }}px
        <input type="range" min="0" max="40" v-model.number="gutter" />
      </label>

      <label style="display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;">
        Min col: {{ minColWidth }}px
        <input type="range" min="100" max="400" v-model.number="minColWidth" />
      </label>

      <label style="display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;">
        Virtualize (JS only)
        <button @click="virtualize = !virtualize" :style="toggleBtn(virtualize)">
          {{ virtualize ? 'ON' : 'OFF' }}
        </button>
      </label>

      <label v-if="virtualize && !usingCss" style="display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;">
        Overscan: {{ overscan }}px
        <input type="range" min="0" max="800" step="50" v-model.number="overscan" />
      </label>

      <label style="display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#555;">
        Animate
        <button @click="animate = !animate" :style="toggleBtn(animate)">
          {{ animate ? 'ON' : 'OFF' }}
        </button>
      </label>

      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-bottom:2px;">
        <button @click="addItem"   :style="actionBtn('#4f46e5')">+ Add</button>
        <button @click="removeItem" :style="actionBtn('#6b7280')">− Remove</button>
        <button @click="resetItems" :style="actionBtn('#9ca3af')">↺ Reset</button>
      </div>
    </div>

    <MasonrySnapGrid
      :items="items"
      :layout-mode="layoutMode"
      :gutter="gutter"
      :min-col-width="minColWidth"
      :animate="animate"
      :virtualize="virtualize"
      :overscan="overscan"
    >
      <template #default="{ item }">
        <div
          :style="{
            background: item.color,
            borderRadius: '12px',
            padding: '16px',
            height: item.height + 'px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '.875rem',
            color: '#333',
          }"
        >
          <strong>{{ item.title }}</strong>
          <p style="color: #555; line-height: 1.5; margin: 0;">{{ item.body }}</p>
        </div>
      </template>
    </MasonrySnapGrid>
  </div>
</template>

<script lang="ts">
// Style helpers (used in :style bindings above)
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
</script>
