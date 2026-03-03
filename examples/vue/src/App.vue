<template>
  <div class="page">
    <h1>Vue 3 – MasonrySnapGridLayout</h1>
    <MasonrySnapGrid :items="items" :gutter="16" :minColWidth="220" layoutMode="auto">
      <template #default="{ item }">
        <div
          :style="{
            height: item.height + 'px',
            borderRadius: '12px',
            padding: '16px',
            color: '#0f172a',
            background: `linear-gradient(135deg,
              hsl(${item.id * 18}, 80%, 60%) 0%,
              hsl(${item.id * 18 + 40}, 90%, 70%) 100%)`,
          }"
        >
          <h3>{{ item.title }}</h3>
        </div>
      </template>
    </MasonrySnapGrid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MasonrySnapGrid from 'masonry-snap-grid-layout/vue';
import 'masonry-snap-grid-layout/style.css';

interface Item {
  id: number;
  title: string;
  height: number;
}

const items = ref<Item[]>(
  Array.from({ length: 24 }, (_, i) => ({
    id: i,
    title: `Card ${i + 1}`,
    height: 140 + Math.random() * 160,
  })),
);
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px;
  background: #020617;
  color: #e5e7eb;
}
</style>

