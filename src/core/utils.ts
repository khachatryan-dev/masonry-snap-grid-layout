/**
 * Calculate the number of columns that fit in the container width.
 * Returns at least 1 column even for zero-width containers.
 */
export function getColumnCount(
  containerWidth: number,
  minColWidth: number,
  gutter: number
): number {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + gutter) / (minColWidth + gutter)));
}

/**
 * Safely check if the browser supports a CSS feature.
 */
export function supportsCss(property: string, value: string): boolean {
  try {
    return typeof CSS !== 'undefined' && CSS.supports(property, value);
  } catch {
    return false;
  }
}
