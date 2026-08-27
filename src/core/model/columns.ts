/**
 * Column count resolution.
 *
 * Two strategies are supported:
 *
 * - **Implicit** (default) — derive the count from `minColWidth`, fitting as
 *   many columns of at least that width as the container allows.
 * - **Explicit** — a fixed `columns` number, or a mobile-first breakpoint map.
 *
 * Breakpoint keys are *minimum* container widths, matching how a
 * `min-width` media query reads: `{ 0: 1, 640: 2, 1024: 3 }` means one column
 * until 640px, two from 640px, three from 1024px. The widest key that is less
 * than or equal to the container width wins; below the smallest key, the
 * smallest key's value is used so there is never an unstyled state.
 */

/** A fixed column count, or a map of `minContainerWidth -> columnCount`. */
export type ColumnsOption = number | Record<number, number>;

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
  return Math.max(
    1,
    Math.floor((containerWidth + gutter) / (minColWidth + gutter))
  );
}

/**
 * Pick the column count for a breakpoint map at a given container width.
 * Exported for testing; prefer {@link resolveColumnCount}.
 */
export function resolveBreakpoints(
  containerWidth: number,
  map: Record<number, number>
): number | null {
  // Numeric sort — object key order is insertion order for non-integer-like
  // keys, so it cannot be relied on.
  const keys = Object.keys(map)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b);

  if (keys.length === 0) return null;

  let chosen = keys[0];
  for (const k of keys) {
    if (containerWidth >= k) chosen = k;
    else break;
  }

  const cols = map[chosen];
  return Number.isFinite(cols) && cols > 0 ? Math.floor(cols) : null;
}

/**
 * Resolve the effective column count. An explicit `columns` option always
 * wins over `minColWidth`; an unusable `columns` value falls back to the
 * implicit calculation rather than throwing.
 */
export function resolveColumnCount(
  containerWidth: number,
  options: {
    columns?: ColumnsOption;
    minColWidth: number;
    gutter: number;
  }
): number {
  const { columns, minColWidth, gutter } = options;

  if (typeof columns === 'number') {
    if (Number.isFinite(columns) && columns > 0) return Math.floor(columns);
  } else if (columns && typeof columns === 'object') {
    const fromMap = resolveBreakpoints(containerWidth, columns);
    if (fromMap !== null) return fromMap;
  }

  return getColumnCount(containerWidth, minColWidth, gutter);
}
