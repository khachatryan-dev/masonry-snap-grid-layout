<script setup lang="ts" generic="T">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  type ComponentPublicInstance,
} from "vue";
import {
  canVirtualize,
  computeLayout,
  computeVisibleIndices,
  createHeightCache,
  createItemObserver,
  createScheduler,
  createScrollTracker,
  EMPTY_SCROLL_STATE,
  resolveColumnCount,
  resolveScrollTarget,
  supportsCss,
  type ColumnsOption,
  type HeightCache,
  type ItemObserver,
  type ItemPosition,
  type LayoutInfo,
  type LayoutMode,
  type ScrollState,
  type ScrollTargetOption,
} from "../core";

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
    layoutMode: "auto",
    gutter: 16,
    minColWidth: 250,
    animate: true,
    transitionDuration: 400,
    virtualize: false,
    overscan: 300,
    observeItemResize: true,
    watchImages: true,
  },
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

/**
 * Measured item heights, cached by item key rather than by index so a height
 * follows its item through prepends, reorders, and filters.
 */
const heightCache: HeightCache = createHeightCache();

const scroll = ref<ScrollState>(EMPTY_SCROLL_STATE);

const hasEstimate = computed(
  () =>
    typeof props.estimatedItemHeight === "number" &&
    props.estimatedItemHeight > 0,
);

// ── Derived styles ────────────────────────────────────────────────────────────
const containerClass = computed(() => {
  if (!isMounted.value) return "msgl-container msgl-container--ssr";
  return useCss.value
    ? "msgl-container msgl-container--css"
    : "msgl-container msgl-container--js";
});

const containerStyle = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {
    "--msgl-transition-duration": `${props.transitionDuration}ms`,
    "--msgl-gutter": `${props.gutter}px`,
    "--msgl-min-col-width": `${props.minColWidth}px`,
  };

  if (useCss.value) {
    if (props.columns !== undefined) {
      const count = resolveColumnCount(
        cssWidth.value || containerRef.value?.offsetWidth || 0,
        {
          columns: props.columns,
          minColWidth: props.minColWidth,
          gutter: props.gutter,
        },
      );
      s.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
    }
    return s;
  }

  if (isMounted.value) {
    s.position = "relative";
    if (containerHeight.value > 0) s.height = `${containerHeight.value}px`;
  }
  return s;
});

function itemKey(item: T, i: number): string | number {
  return props.getItemKey ? props.getItemKey(item, i) : i;
}

function getItemClass(i: number): string {
  const positioned =
    isMounted.value && !useCss.value && positions.value[i] !== undefined;
  return positioned && props.animate
    ? "msgl-item msgl-item--animated"
    : "msgl-item";
}

function getItemStyle(i: number): Record<string, string> {
  const pos = positions.value[i];
  // In CSS mode the browser places the items; leftover JS transforms from a
  // previous `layoutMode` would fight it.
  if (!isMounted.value || useCss.value || !pos) return {};
  return {
    position: "absolute",
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
    itemCount: props.items.length,
  });

  if (!active || useCss.value) return null;

  // `positions` lags `items` for one tick after an items change, and some
  // items may be unmeasured. Both are handled per-item by the core, which
  // forces just those items to render rather than abandoning virtualization
  // for the whole list.
  return computeVisibleIndices({
    count: props.items.length,
    positions: positions.value,
    heights: heightCache.read(props.items.map(itemKey)),
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

  const { gutter, minColWidth, items, columns } = props;

  const keys = items.map(itemKey);

  // Heights for items that no longer exist would otherwise accumulate for the
  // lifetime of the grid.
  heightCache.retain(keys);

  const knownBefore = heightCache.size;

  // Measure currently-rendered items; off-screen items reuse cached heights.
  itemEls.value.slice(0, items.length).forEach((el, i) => {
    if (el) heightCache.set(keys[i], el.offsetHeight);
  });

  const heights = heightCache.read(keys);

  // Items still waiting on a height will have been forced into the DOM by the
  // render this pass triggers; come back once they are mounted. Gating on
  // having learned something is what makes it terminate — an item that
  // genuinely measures zero never counts as progress.
  if (heightCache.size > knownBefore && heights.some((h) => h === undefined)) {
    remeasureScheduler.schedule();
  }

  // Positions are computed for ALL items, using cached or estimated heights, so
  // the container height and scrollbar stay correct while items are virtualized.
  const result = computeLayout({
    count: items.length,
    heights,
    containerWidth: w,
    gutter,
    minColWidth,
    columns,
    fallbackHeight: hasEstimate.value ? props.estimatedItemHeight : 0,
  });

  positions.value = result.positions;
  containerHeight.value = result.containerHeight;

  emit("layout", {
    columnCount: result.columnCount,
    columnWidth: result.columnWidth,
    containerHeight: result.containerHeight,
    itemCount: items.length,
    engine: "js",
  });
}

// ── Item element refs + self-healing observation ──────────────────────────────
let itemObserver: ItemObserver | null = null;

function collectItemRef(
  el: Element | ComponentPublicInstance | null,
  i: number,
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

/** `watchImages` the live item observer was built with; it is fixed at construction. */
let observerWatchesImages = true;

/** Coalesced relayout after a container width change invalidates heights. */
const widthChangeScheduler = createScheduler(() => {
  heightCache.clear();
  runLayout();
});

/**
 * Follow-up pass for when a measurement round learned something but left items
 * unmeasured — they only exist in the DOM after the render it triggers.
 */
const remeasureScheduler = createScheduler(() => runLayout());

function startScrollTracking(): void {
  disposeScroll?.();
  const target = resolveScrollTarget(props.scrollContainer);
  disposeScroll = createScrollTracker(
    target,
    () => containerRef.value,
    (state) => {
      scroll.value = state;
    },
  );
}

/**
 * Bring the item observer in line with the current props.
 *
 * Creating it only on mount meant `observeItemResize` and `watchImages` were
 * read exactly once: flipping either afterwards silently did nothing, and the
 * self-healing path stayed dead for the component's lifetime.
 */
function syncItemObserver(): void {
  const wanted = !useCss.value && props.observeItemResize;

  if (!wanted) {
    itemObserver?.disconnect();
    itemObserver = null;
    return;
  }

  // `watchImages` cannot be changed on a live observer, so a change rebuilds it.
  if (itemObserver && observerWatchesImages === props.watchImages) return;

  itemObserver?.disconnect();
  observerWatchesImages = props.watchImages;
  itemObserver = createItemObserver({
    onChange: () => runLayout(),
    watchImages: props.watchImages,
  });

  // Adopt items that mounted before the observer existed.
  itemEls.value.forEach((el) => el && itemObserver?.observe(el));
}

/** Watch the container purely to re-resolve a breakpoint map. */
function startCssWidthObserver(): void {
  if (
    props.columns === undefined ||
    typeof ResizeObserver === "undefined" ||
    !containerRef.value
  ) {
    return;
  }
  resizeObserver = new ResizeObserver((entries) => {
    cssWidth.value = entries[0].contentRect.width;
  });
  resizeObserver.observe(containerRef.value);
}

function startContainerWidthObserver(): void {
  if (typeof ResizeObserver === "undefined" || !containerRef.value) return;

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

/** Start everything the active engine needs. */
function enterMode(): void {
  if (useCss.value) {
    startCssWidthObserver();
    return;
  }

  syncItemObserver();
  runLayout();
  startContainerWidthObserver();
  if (props.virtualize) startScrollTracking();
}

/** Stop everything the active engine started. Safe to call repeatedly. */
function leaveMode(): void {
  widthChangeScheduler.cancel();
  remeasureScheduler.cancel();
  resizeObserver?.disconnect();
  resizeObserver = null;
  itemObserver?.disconnect();
  itemObserver = null;
  disposeScroll?.();
  disposeScroll = null;
}

function resolveUseCss(): boolean {
  // 'auto' (default): use CSS masonry if the browser supports it, else JS.
  // 'js': always use JS masonry.
  if (props.layoutMode === "js") return false;
  return supportsCss("grid-template-rows", "masonry");
}

onMounted(async () => {
  useCss.value = resolveUseCss();
  isMounted.value = true;
  await nextTick();
  enterMode();
});

onBeforeUnmount(leaveMode);

// Switching engines at runtime: tear the old one down, discard any layout it
// wrote, and start the new one. Previously `layoutMode` was read once on mount,
// so binding it to a ref did nothing after first render.
watch(
  () => props.layoutMode,
  async () => {
    if (!isMounted.value) return;

    const next = resolveUseCss();
    if (next === useCss.value) return;

    leaveMode();
    useCss.value = next;
    positions.value = [];
    containerHeight.value = 0;
    heightCache.clear();

    await nextTick();
    enterMode();
  },
);

// Item observation is likewise a live setting, not a mount-time one.
watch([() => props.observeItemResize, () => props.watchImages], () => {
  if (!isMounted.value) return;
  syncItemObserver();
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
    // New items render unconditionally until they have been measured — see
    // computeVisibleIndices — so one layout pass after they mount is enough.
    await nextTick();
    runLayout();
  },
);

watch(
  [() => props.gutter, () => props.minColWidth, () => props.columns],
  async () => {
    if (!isMounted.value || useCss.value) return;
    await nextTick();
    runLayout();
  },
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
