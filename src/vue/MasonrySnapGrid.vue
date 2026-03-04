<script setup lang="ts" generic="T">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  type ComponentPublicInstance,
} from 'vue';
import type { LayoutMode } from '../core/types';
import { getColumnCount, supportsCss } from '../core/utils';

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    items: T[];
    layoutMode?: LayoutMode;
    gutter?: number;
    minColWidth?: number;
    animate?: boolean;
    transitionDuration?: number;
  }>(),
  {
    layoutMode: 'auto',
    gutter: 16,
    minColWidth: 250,
    animate: true,
    transitionDuration: 400,
  }
);

// ── Slots ─────────────────────────────────────────────────────────────────────
defineSlots<{
  default(slotProps: { item: T; index: number }): unknown;
}>();

// ── State ─────────────────────────────────────────────────────────────────────
interface Position { x: number; y: number; width: number }

const containerRef = ref<HTMLDivElement | null>(null);
const itemEls = ref<HTMLDivElement[]>([]);
const positions = ref<Position[]>([]);
const containerHeight = ref(0);
const isMounted = ref(false);
const useCss = ref(false);

// ── Derived styles ────────────────────────────────────────────────────────────
const containerClass = computed(() => {
  if (!isMounted.value) return 'msgl-container msgl-container--ssr';
  return useCss.value
    ? 'msgl-container msgl-container--css'
    : 'msgl-container msgl-container--js';
});

const containerStyle = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {
    '--msgl-transition-duration': `${props.transitionDuration}ms`,
  };
  if (useCss.value) {
    s['--msgl-gutter'] = `${props.gutter}px`;
    s['--msgl-min-col-width'] = `${props.minColWidth}px`;
    return s;
  }
  if (isMounted.value) {
    s.position = 'relative';
    if (containerHeight.value > 0) s.height = `${containerHeight.value}px`;
  }
  return s;
});

function getItemClass(i: number): string {
  const positioned = isMounted.value && positions.value[i] !== undefined;
  return positioned && props.animate
    ? 'msgl-item msgl-item--animated'
    : 'msgl-item';
}

function getItemStyle(i: number): Record<string, string> {
  const pos = positions.value[i];
  if (!isMounted.value || !pos) return {};
  return {
    position: 'absolute',
    width: `${pos.width}px`,
    transform: `translate(${pos.x}px, ${pos.y}px)`,
  };
}

// ── Layout calculation ────────────────────────────────────────────────────────
function computeLayout(): void {
  const container = containerRef.value;
  if (!container) return;

  const w = container.offsetWidth;
  if (w <= 0) return;

  const { gutter, minColWidth, items } = props;
  const cols = getColumnCount(w, minColWidth, gutter);
  const colW = (w - gutter * (cols - 1)) / cols;
  const colHeights: number[] = new Array<number>(cols).fill(0);

  const newPos: Position[] = itemEls.value.slice(0, items.length).map((el) => {
    const minH = Math.min(...colHeights);
    const col = colHeights.indexOf(minH);
    const pos: Position = { x: col * (colW + gutter), y: colHeights[col], width: colW };
    colHeights[col] += (el?.offsetHeight ?? 0) + gutter;
    return pos;
  });

  positions.value = newPos;
  containerHeight.value = Math.max(
    0,
    items.length > 0 ? Math.max(...colHeights) - gutter : 0
  );
}

// ── Collect item element refs from v-for ──────────────────────────────────────
function collectItemRef(
  el: Element | ComponentPublicInstance | null,
  i: number
): void {
  if (el instanceof HTMLElement) {
    itemEls.value[i] = el as HTMLDivElement;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  if (props.layoutMode === 'css') {
    useCss.value = true;
  } else if (props.layoutMode === 'auto') {
    useCss.value = supportsCss('grid-template-rows', 'masonry');
  }

  isMounted.value = true;

  if (!useCss.value) {
    await nextTick(); // wait for items to render with correct widths
    computeLayout();

    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      resizeObserver = new ResizeObserver(computeLayout);
      resizeObserver.observe(containerRef.value);
    }
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  () => props.items,
  async () => {
    if (!isMounted.value || useCss.value) return;
    await nextTick();
    computeLayout();
  }
);

watch([() => props.gutter, () => props.minColWidth], async () => {
  if (!isMounted.value || useCss.value) return;
  await nextTick();
  computeLayout();
});
</script>

<template>
  <div ref="containerRef" :class="containerClass" :style="containerStyle">
    <div
      v-for="(item, i) in items"
      :key="i"
      :ref="(el) => collectItemRef(el, i)"
      :class="getItemClass(i)"
      :style="getItemStyle(i)"
    >
      <slot :item="item" :index="i" />
    </div>
  </div>
</template>
