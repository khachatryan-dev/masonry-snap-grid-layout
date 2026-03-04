import { getColumnCount } from './utils';

/**
 * Apply JS-powered masonry layout using absolute positioning and CSS transforms.
 * Uses the "shortest column first" greedy algorithm for optimal item placement.
 * Minimal DOM thrashing: sets widths first, reads heights once, then sets transforms.
 */
export function applyMasonryLayout(
  container: HTMLElement,
  items: HTMLElement[],
  minColWidth: number,
  gutter: number,
  animate: boolean,
  duration: number
): void {
  const containerWidth = container.clientWidth;
  if (containerWidth <= 0) return;

  const cols = getColumnCount(containerWidth, minColWidth, gutter);
  const colWidth = (containerWidth - gutter * (cols - 1)) / cols;

  // Set widths first so content can reflow to correct dimensions
  items.forEach((item) => {
    item.style.position = 'absolute';
    item.style.width = `${colWidth}px`;
    if (animate) {
      item.style.transition = `transform ${duration}ms ease`;
    } else {
      item.style.transition = '';
    }
  });

  // Reading offsetHeight forces a single reflow with correct widths applied
  const colHeights = new Array<number>(cols).fill(0);

  items.forEach((item) => {
    const minHeight = Math.min(...colHeights);
    const colIndex = colHeights.indexOf(minHeight);

    const x = colIndex * (colWidth + gutter);
    const y = colHeights[colIndex];

    item.style.transform = `translate(${x}px, ${y}px)`;
    colHeights[colIndex] += item.offsetHeight + gutter;
  });

  container.style.position = 'relative';
  // Subtract trailing gutter to get true content height; clamp to 0 for empty grids
  const maxColHeight = items.length > 0 ? Math.max(...colHeights) - gutter : 0;
  container.style.height = `${Math.max(0, maxColHeight)}px`;
}

/**
 * Remove all JS masonry inline styles from the container and its items.
 */
export function removeMasonryLayout(
  container: HTMLElement,
  items: HTMLElement[]
): void {
  items.forEach((item) => {
    item.style.position = '';
    item.style.width = '';
    item.style.transform = '';
    item.style.transition = '';
  });
  container.style.position = '';
  container.style.height = '';
}
