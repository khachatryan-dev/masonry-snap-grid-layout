import { resolveColumnCount } from '../model/columns';
import type { ColumnsOption } from '../model/columns';

/**
 * Apply native CSS masonry layout using CSS Grid with `grid-template-rows: masonry`.
 *
 * This is an experimental CSS feature whose specification is still settling, so
 * it is only ever applied after an explicit `CSS.supports()` check.
 *
 * When `columns` is supplied the track list becomes explicit; a breakpoint map
 * is resolved against the container's current width, and re-resolved whenever
 * the caller re-applies on resize.
 */
export function applyCssMasonry(
  container: HTMLElement,
  gutter: number,
  minColWidth: number,
  columns?: ColumnsOption
): void {
  container.style.display = 'grid';

  if (columns !== undefined) {
    const count = resolveColumnCount(container.clientWidth, {
      columns,
      minColWidth,
      gutter,
    });
    container.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
  } else {
    container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`;
  }

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
