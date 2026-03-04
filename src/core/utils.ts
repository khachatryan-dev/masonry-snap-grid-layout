export function getColumnCount(containerWidth: number, minColWidth: number, gutter: number) {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
}