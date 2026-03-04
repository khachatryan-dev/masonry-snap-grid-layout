import {
  __spreadValues
} from "./chunk-WDMUDEB6.js";

// ../../dist/utils-BR22GHCe.js
function getColumnCount(containerWidth, minColWidth, gutter) {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
}
function supportsCss(property, value) {
  try {
    return typeof CSS !== "undefined" && CSS.supports(property, value);
  } catch {
    return false;
  }
}

// ../../dist/index.js
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
function applyMasonryLayout(container, items, minColWidth, gutter, animate, duration) {
  const containerWidth = container.clientWidth;
  if (containerWidth <= 0) return;
  const cols = getColumnCount(containerWidth, minColWidth, gutter);
  const colWidth = (containerWidth - gutter * (cols - 1)) / cols;
  items.forEach((item) => {
    item.style.position = "absolute";
    item.style.width = `${colWidth}px`;
    if (animate) {
      item.style.transition = `transform ${duration}ms ease`;
    } else {
      item.style.transition = "";
    }
  });
  const colHeights = new Array(cols).fill(0);
  items.forEach((item) => {
    const minHeight = Math.min(...colHeights);
    const colIndex = colHeights.indexOf(minHeight);
    const x = colIndex * (colWidth + gutter);
    const y = colHeights[colIndex];
    item.style.transform = `translate(${x}px, ${y}px)`;
    colHeights[colIndex] += item.offsetHeight + gutter;
  });
  container.style.position = "relative";
  const maxColHeight = items.length > 0 ? Math.max(...colHeights) - gutter : 0;
  container.style.height = `${Math.max(0, maxColHeight)}px`;
}
function removeMasonryLayout(container, items) {
  items.forEach((item) => {
    item.style.position = "";
    item.style.width = "";
    item.style.transform = "";
    item.style.transition = "";
  });
  container.style.position = "";
  container.style.height = "";
}
function applyCssMasonry(container, gutter, minColWidth) {
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`;
  container.style.gridTemplateRows = "masonry";
  container.style.gap = `${gutter}px`;
  container.style.alignContent = "start";
}
function removeCssMasonry(container) {
  container.style.display = "";
  container.style.gridTemplateColumns = "";
  container.style.gridTemplateRows = "";
  container.style.gap = "";
  container.style.alignContent = "";
}
var MasonrySnapGridLayout = class {
  constructor(container, options) {
    __publicField(this, "container");
    __publicField(this, "options");
    __publicField(this, "elements", []);
    __publicField(this, "resizeObserver");
    __publicField(this, "usesCss", false);
    this.container = container;
    this.options = __spreadValues({
      layoutMode: "auto",
      gutter: 16,
      minColWidth: 250,
      animate: true,
      transitionDuration: 400
    }, options);
    this.init();
  }
  init() {
    this.usesCss = this.shouldUseCss();
    this.render();
    this.observeResize();
  }
  shouldUseCss() {
    const { layoutMode } = this.options;
    if (layoutMode === "css") return true;
    if (layoutMode === "js") return false;
    return supportsCss("grid-template-rows", "masonry");
  }
  render() {
    this.container.innerHTML = "";
    this.elements = this.options.items.map((item) => this.options.renderItem(item));
    this.elements.forEach((el) => this.container.appendChild(el));
    this.layout();
  }
  layout() {
    const { gutter, minColWidth, animate, transitionDuration } = this.options;
    if (this.usesCss) {
      applyCssMasonry(this.container, gutter, minColWidth);
    } else {
      applyMasonryLayout(
        this.container,
        this.elements,
        minColWidth,
        gutter,
        animate,
        transitionDuration
      );
    }
  }
  observeResize() {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.container);
  }
  /** Replace all items and re-render the grid. */
  updateItems(newItems) {
    this.options.items = newItems;
    this.render();
  }
  /** Clean up DOM mutations and stop observing resize. */
  destroy() {
    var _a;
    (_a = this.resizeObserver) == null ? void 0 : _a.disconnect();
    if (this.usesCss) {
      removeCssMasonry(this.container);
    } else {
      removeMasonryLayout(this.container, this.elements);
    }
    this.container.innerHTML = "";
    this.elements = [];
  }
};
export {
  MasonrySnapGridLayout as default
};
//# sourceMappingURL=masonry-snap-grid-layout.js.map
