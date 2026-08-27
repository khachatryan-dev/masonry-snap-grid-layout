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
import {
  canVirtualize,
  computeLayout,
  computeVisibleIndices,
  createItemObserver,
  createScheduler,
  createScrollTracker,
  EMPTY_SCROLL_STATE,
  resolveColumnCount,
  resolveScrollTarget,
  supportsCss,
  type ColumnsOption,
  type ItemObserver,
  type ItemPosition,
  type LayoutInfo,
  type LayoutMode,
  type ScrollState,
  type ScrollTargetOption,
} from '../core';

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    items: T[];
    layoutMode?: LayoutMode;
    gutter?: number;
    minColWidth?: number;
    /**
     * Fixed column count, or a mobile-first map of `minContainerWidth -> columns`
     * such as `{ 0: 1, 640: 2, 1024: 3 }`. Overrides `minColWidth` when set.
     */
    columns?: ColumnsOption;
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
    /**
     * Scrolling viewport used for virtualization. Defaults to the page; pass an
     * element to virtualize inside an `overflow: auto` container.
     */
    scrollContainer?: ScrollTargetOption;
    /**
     * Assumed item height before measurement. Lets very large lists skip the
     * render-everything measurement pass.
     */
    estimatedItemHeight?: number;
    /**
     * Stable identity per item, used as the `:key` and to keep cached heights
     * attached to the right item across reorders. Strongly recommended when
     * items can be reordered, filtered, or prepended.
     */
    getItemKey?: (item: T, index: number) => string | number;
    /**
     * Watch each item for size changes so the layout self-heals when content
     * settles — images decoding, fonts swapping, embeds resizing. Default: true
     */
    observeItemResize?: boolean;
    /** Also listen for image `load`/`error` inside items. Default: true */
    watchImages?: boolean;
  }>(),
  {
    layoutMode: 'auto',
    gutter: 16,
    minColWidth: 250,
    animate: true,
    transitionDuration: 400,
    virtualize: false,
    overscan: 300,
    observeItemResize: true,
    watchImages: true,
  }
);

// ── Emits ─────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  layout: [info: LayoutInfo];
}>();

// ── Slots ─────────────────────────────────────────────────────────────────────
defineSlots<{
  default(slotProps: { item: T; index: number }): unknown;
}>();

// ── State ─────────────────────────────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null);
const itemEls = ref<(HTMLDivElement | null)[]>([]);
const positions = ref<ItemPosition[]>([]);
const containerHeight = ref(0);
const isMounted = ref(false);
const useCss = ref(false);
const cssWidth = ref(0);

/** Cached measured offsetHeight for each item by index. */
const cachedHeights: number[] = [];
/** Whether all items have been measured at least once. */
let isMeasuredFlag = false;

const isMeasured = ref(false); // reactive mirror for template/computed
const scroll = ref<ScrollState>(EMPTY_SCROLL_STATE);

const hasEstimate = computed(
  () =>
    typeof props.estimatedItemHeight === 'number' && props.estimatedItemHeight > 0
);

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
    '--msgl-gutter': `${props.gutter}px`,
    '--msgl-min-col-width': `${props.minColWidth}px`,
  };

  if (useCss.value) {
    if (props.columns !== undefined) {
      const count = resolveColumnCount(
        cssWidth.value || containerRef.value?.offsetWidth || 0,
        {
          columns: props.columns,
          minColWidth: props.minColWidth,
          gutter: props.gutter,
        }
      );
      s.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
    }
    return s;
  }

  if (isMounted.value) {
    s.position = 'relative';
    if (containerHeight.value > 0) s.height = `${containerHeight.value}px`;
  }
  return s;
});

function itemKey(item: T, i: number): string | number {
  return props.getItemKey ? props.getItemKey(item, i) : i;
}

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
 * Indices currently inside the viewport, or `null` when every item renders.
 * Computed once per dependency change rather than per item, so rendering a
 * large list does not run the visibility maths N times.
 */
const visibleIndices = computed<Set<number> | null>(() => {
  const active = canVirtualize({
    virtualize: props.virtualize,
    isMeasured: isMeasured.value,
    hasEstimate: hasEstimate.value,
    itemCount: props.items.length,
  });

  if (!active || positions.value.length !== props.items.length) return null;

  return computeVisibleIndices({
    positions: positions.value,
    heights: cachedHeights,
    scroll: scroll.value,
    overscan: props.overscan,
    fallbackHeight: hasEstimate.value ? props.estimatedItemHeight : 0,
  });
});

function isVisible(i: number): boolean {
  const visible = visibleIndices.value;
  return visible === null || visible.has(i);
}

// ── Layout calculation ────────────────────────────────────────────────────────
function runLayout(): void {
  const container = containerRef.value;
  if (!container) return;

  const w = container.offsetWidth;
  if (w <= 0) return;

  const { gutter, minColWidth, items, virtualize, columns } = props;

  // Measure currently-rendered items; off-screen items reuse cached heights.
  itemEls.value.slice(0, items.length).forEach((el, i) => {
    if (el) {
      const h = el.offsetHeight;
      if (h > 0) cachedHeights[i] = h;
    }
  });

  // Positions are computed for ALL items, using cached or estimated heights, so
  // the container height and scrollbar stay correct while items are virtualized.
  const result = computeLayout({
    count: items.length,
    heights: cachedHeights,
    containerWidth: w,
    gutter,
    minColWidth,
    columns,
    fallbackHeight: hasEstimate.value ? props.estimatedItemHeight : 0,
  });

  positions.value = result.positions;
  containerHeight.value = result.containerHeight;

  // Enable virtualization once all items have a cached height.
  if (virtualize && !isMeasuredFlag) {
    const allCached = items.every((_, i) => (cachedHeights[i] ?? 0) > 0);
    if (allCached) {
      isMeasuredFlag = true;
      isMeasured.value = true;
    }
  }

  emit('layout', {
    columnCount: result.columnCount,
    columnWidth: result.columnWidth,
    containerHeight: result.containerHeight,
    itemCount: items.length,
    engine: 'js',
  });
}

// ── Item element refs + self-healing observation ──────────────────────────────
let itemObserver: ItemObserver | null = null;

function collectItemRef(
  el: Element | ComponentPublicInstance | null,
  i: number
): void {
  const next = el instanceof HTMLElement ? (el as HTMLDivElement) : null;
  const prev = itemEls.value[i];

  if (prev && prev !== next) itemObserver?.unobserve(prev);
  itemEls.value[i] = next;
  if (next) itemObserver?.observe(next);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let resizeObserver: ResizeObserver | null = null;
let disposeScroll: (() => void) | null = null;

/** Coalesced relayout after a container width change invalidates heights. */
const widthChangeScheduler = createScheduler(() => {
  cachedHeights.length = 0;
  isMeasuredFlag = false;
  isMeasured.value = false;
  runLayout();
});

function startScrollTracking(): void {
  disposeScroll?.();
  const target = resolveScrollTarget(props.scrollContainer);
  disposeScroll = createScrollTracker(
    target,
    () => containerRef.value,
    (state) => {
      scroll.value = state;
    }
  );
}

onMounted(async () => {
  // 'auto' (default): use CSS masonry if browser supports it, else JS
  // 'js': always use JS masonry
  if (props.layoutMode !== 'js') {
    useCss.value = supportsCss('grid-template-rows', 'masonry');
  }

  isMounted.value = true;
  await nextTick();

  if (useCss.value) {
    // Only needed to resolve a breakpoint map against the container width.
    if (
      props.columns !== undefined &&
      typeof ResizeObserver !== 'undefined' &&
      containerRef.value
    ) {
      resizeObserver = new ResizeObserver((entries) => {
        cssWidth.value = entries[0].contentRect.width;
      });
      resizeObserver.observe(containerRef.value);
    }
    return;
  }

  if (props.observeItemResize) {
    itemObserver = createItemObserver({
      onChange: () => runLayout(),
      watchImages: props.watchImages,
    });
    // Adopt items that mounted before the observer existed.
    itemEls.value.forEach((el) => el && itemObserver?.observe(el));
  }

  runLayout();

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    let prevWidth = -1;
    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      // Only width matters — reacting to height would feed back into the
      // container height this component sets itself.
      if (prevWidth === width) return;
      prevWidth = width;
      widthChangeScheduler.schedule();
    });
    resizeObserver.observe(containerRef.value);
  }

  if (props.virtualize) startScrollTracking();
});

onBeforeUnmount(() => {
  widthChangeScheduler.cancel();
  resizeObserver?.disconnect();
  itemObserver?.disconnect();
  disposeScroll?.();
});

// Re-subscribe when the scroll target or virtualize flag changes.
watch([() => props.scrollContainer, () => props.virtualize], () => {
  if (!isMounted.value || useCss.value) return;
  if (props.virtualize) startScrollTracking();
  else {
    disposeScroll?.();
    disposeScroll = null;
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
    runLayout();
  }
);

watch(
  [() => props.gutter, () => props.minColWidth, () => props.columns],
  async () => {
    if (!isMounted.value || useCss.value) return;
    await nextTick();
    runLayout();
  }
);

/*
 * Template notes
 * --------------
 * SSR: the server renders every item with the --ssr class (a plain CSS grid),
 * so items appear in the page source and are indexable by crawlers. The client
 * switches to --js after hydration and applies masonry transforms.
 *
 * The root <div> must remain the ONLY top-level node in the template. A sibling
 * comment turns this into a fragment component, which silently breaks attribute
 * fallthrough: `class` and `style` passed by a parent would never apply. Vue
 * strips comments in production but keeps them in development, so the bug would
 * only appear in dev builds.
 */

// ── Public API ────────────────────────────────────────────────────────────────
defineExpose({
  /** Recompute the layout immediately. */
  refresh: runLayout,
});
</script>

<template>
  <div ref="containerRef" :class="containerClass" :style="containerStyle">
    <template v-for="(item, i) in items" :key="itemKey(item, i)">
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
