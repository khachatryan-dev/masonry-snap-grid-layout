<script setup lang="ts">
import { ref } from 'vue';
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
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

const items = ref<Card[]>(Array.from({ length: 12 }, (_, i) => makeItem(i)));
const gutter = ref(16);
const minColWidth = ref(220);
let nextId = items.value.length;

function addItem() {
  items.value = [...items.value, makeItem(nextId++)];
}

function removeItem() {
  items.value = items.value.slice(0, -1);
}
</script>

<template>
  <div style="font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; padding: 24px;">
    <h1 style="margin-bottom: 24px; font-size: 1.4rem; color: #333;">
      masonry-snap-grid-layout — Vue 3 Demo
    </h1>

    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 24px;">
      <label style="font-size: .875rem; color: #555;">
        Gutter: {{ gutter }}px &nbsp;
        <input type="range" min="4" max="40" v-model.number="gutter" />
      </label>
      <label style="font-size: .875rem; color: #555;">
        Min col: {{ minColWidth }}px &nbsp;
        <input type="range" min="100" max="400" v-model.number="minColWidth" />
      </label>
      <button @click="addItem" style="padding: 8px 16px; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; font-size: .875rem;">
        + Add item
      </button>
      <button @click="removeItem" style="padding: 8px 16px; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; font-size: .875rem;">
        - Remove item
      </button>
    </div>

    <MasonrySnapGrid
      :items="items"
      layout-mode="js"
      :gutter="gutter"
      :min-col-width="minColWidth"
      :animate="true"
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
