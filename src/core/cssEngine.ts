/**
 * Apply native CSS masonry layout using CSS Grid with grid-template-rows: masonry.
 * This is an experimental CSS feature available in Firefox with a flag
 * and progressively rolling out in other engines.
 */
export function applyCssMasonry(
  container: HTMLElement,
  gutter: number,
  minColWidth: number
): void {
  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`;
  container.style.gridTemplateRows = 'masonry';
  container.style.gap = `${gutter}px`;
  container.style.alignContent = 'start';
}

/**
 * Remove CSS masonry styles from a container.
 */
export function removeCssMasonry(container: HTMLElement): void {
  container.style.display = '';
  container.style.gridTemplateColumns = '';
  container.style.gridTemplateRows = '';
  container.style.gap = '';
  container.style.alignContent = '';
}
