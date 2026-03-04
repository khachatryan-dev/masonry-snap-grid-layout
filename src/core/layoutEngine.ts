import { getColumnCount } from './utils';

export function applyMasonryLayout(
  container: HTMLElement,
  items: HTMLElement[],
  minColWidth: number,
  gutter: number,
  animate: boolean,
  duration: number
) {
  const width = container.clientWidth;
  const cols = getColumnCount(width, minColWidth, gutter);
  const colHeights = new Array(cols).fill(0);
  const colWidth = (width - gutter * (cols - 1)) / cols;

  items.forEach((item) => {
    item.style.position = 'absolute';
    item.style.width = `${colWidth}px`;

    const minHeight = Math.min(...colHeights);
    const colIndex = colHeights.indexOf(minHeight);

    const x = colIndex * (colWidth + gutter);
    const y = minHeight;

    if (animate) {
      item.style.transition = `transform ${duration}ms ease`;
    }

    item.style.transform = `translate(${x}px, ${y}px)`;
    colHeights[colIndex] += item.offsetHeight + gutter;
  });

  container.style.position = 'relative';
  container.style.height = `${Math.max(...colHeights, 0)}px`;
}