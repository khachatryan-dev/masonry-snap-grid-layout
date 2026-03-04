export function applyCssMasonry(container: HTMLElement, gutter: number, minColWidth: number) {
  container.style.columnGap = `${gutter}px`;
  container.style.columnWidth = `${minColWidth}px`;
}