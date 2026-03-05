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
    /**
     * Enable scroll-based virtualization for large datasets (JS masonry mode only).
     * After the initial measurement pass, only items visible within the viewport
     * plus the `overscan` buffer are kept in the DOM. Default: false
     */
    virtualize?: boolean;
    /**
     * Pixel buffer above and below the viewport rendered during virtualization.
     * Larger values reduce pop-in on fast scrolling. Default: 300
     */
    overscan?: number;
  }>(),
  {
    layoutMode: 'auto',
    gutter: 16,
    minColWidth: 250,
    animate: true,
    transitionDuration: 400,
    virtualize: false,
    overscan: 300,
  }
);

// ── Slots ─────────────────────────────────────────────────────────────────────
defineSlots<{
  default(slotProps: { item: T; index: number }): unknown;
}>();

// ── State ─────────────────────────────────────────────────────────────────────
interface Position { x: number; y: number; width: number }

const containerRef = ref<HTMLDivElement | null>(null);
const itemEls = ref<(HTMLDivElement | null)[]>([]);
const positions = ref<Position[]>([]);
const containerHeight = ref(0);
const isMounted = ref(false);
const useCss = ref(false);

/** Cached measured offsetHeight for each item by index. */
const cachedHeights: number[] = [];
/** Container's absolute top from document top (updated on mount/resize). */
let containerAbsTop = 0;
/** Whether all items have been measured at least once. */
let isMeasuredFlag = false;

const isMeasured = ref(false); // reactive mirror for template/computed
const scrollY = ref(0);
const viewportH = ref(0);

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

// ── Visibility for virtualization ─────────────────────────────────────────────
/**
 * Returns true when the item at index `i` should be rendered.
 * While virtualization is inactive (or not yet measured), all items are shown.
 */
function isVisible(i: number): boolean {
  if (!props.virtualize || !isMeasured.value || positions.value.length === 0) {
    return true;
  }
  const pos = positions.value[i];
  if (!pos) return true;
  const itemH = cachedHeights[i] ?? 0;
  const relStart = scrollY.value - containerAbsTop - props.overscan;
  const relEnd = scrollY.value - containerAbsTop + viewportH.value + props.overscan;
  return pos.y + itemH >= relStart && pos.y <= relEnd;
}

// ── Layout calculation ────────────────────────────────────────────────────────
function computeLayout(): void {
  const container = containerRef.value;
  if (!container) return;

  const w = container.offsetWidth;
  if (w <= 0) return;

  const { gutter, minColWidth, items, virtualize } = props;
  const cols = getColumnCount(w, minColWidth, gutter);
  const colW = (w - gutter * (cols - 1)) / cols;
  const colHeights: number[] = new Array<number>(cols).fill(0);

  // Measure currently-rendered items; off-screen items reuse cached heights.
  itemEls.value.slice(0, items.length).forEach((el, i) => {
    if (el) {
      const h = el.offsetHeight;
      if (h > 0) cachedHeights[i] = h;
    }
  });

  // Compute positions for ALL items using cached heights so the container
  // height and scrollbar are always correct even when items are virtualized.
  const newPos: Position[] = items.map((_, i) => {
    const minH = Math.min(...colHeights);
    const col = colHeights.indexOf(minH);
    const pos: Position = { x: col * (colW + gutter), y: colHeights[col], width: colW };
    colHeights[col] += (cachedHeights[i] ?? 0) + gutter;
    return pos;
  });

  positions.value = newPos;
  containerHeight.value = Math.max(
    0,
    items.length > 0 ? Math.max(...colHeights) - gutter : 0
  );

  // Enable virtualization once all items have a cached height.
  if (virtualize && !isMeasuredFlag) {
    const allCached = items.every((_, i) => (cachedHeights[i] ?? 0) > 0);
    if (allCached) {
      isMeasuredFlag = true;
      isMeasured.value = true;
    }
  }
}

// ── Collect item element refs from v-for ──────────────────────────────────────
function collectItemRef(
  el: Element | ComponentPublicInstance | null,
  i: number
): void {
  if (el instanceof HTMLElement) {
    itemEls.value[i] = el as HTMLDivElement;
  } else {
    itemEls.value[i] = null;
  }
}

// ── Scroll tracking ───────────────────────────────────────────────────────────
function syncContainerTop(): void {
  if (containerRef.value) {
    containerAbsTop =
      containerRef.value.getBoundingClientRect().top + window.scrollY;
  }
}

function onScroll(): void {
  scrollY.value = window.scrollY;
}

function onWindowResize(): void {
  viewportH.value = window.innerHeight;
  syncContainerTop();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  // 'auto' (default): use CSS masonry if browser supports it, else JS
  // 'js': always use JS masonry
  if (props.layoutMode !== 'js') {
    useCss.value = supportsCss('grid-template-rows', 'masonry');
  }

  isMounted.value = true;

  if (!useCss.value) {
    await nextTick();
    computeLayout();

    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        // Clear height cache on resize — column widths change, so item heights change.
        cachedHeights.length = 0;
        isMeasuredFlag = false;
        isMeasured.value = false;
        computeLayout();
      });
      resizeObserver.observe(containerRef.value);
    }

    if (props.virtualize) {
      viewportH.value = window.innerHeight;
      syncContainerTop();
      scrollY.value = window.scrollY;
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onWindowResize);
    }
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (props.virtualize) {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onWindowResize);
  }
});

// Re-layout when items change
watch(
  () => props.items,
  async () => {
    if (!isMounted.value || useCss.value) return;
    if (props.virtualize) {
      // Reset measurement so all items are re-rendered for re-measurement
      isMeasuredFlag = false;
      isMeasured.value = false;
      cachedHeights.splice(props.items.length);
    }
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
  <!--
    SSR note: the server renders all items with the --ssr class (a plain CSS grid),
    so they are visible in the page source and indexable by crawlers.
    The client switches to --js after hydration and applies masonry positions.
  -->
  <div ref="containerRef" :class="containerClass" :style="containerStyle">
    <template v-for="(item, i) in items" :key="i">
      <div
        v-if="isVisible(i)"
        :ref="(el) => collectItemRef(el, i)"
        :class="getItemClass(i)"
        :style="getItemStyle(i)"
      >
        <slot :item="item" :index="i" />
      </div>
    </template>
  </div>
</template>
