/**
 * Measured item heights, cached by item identity.
 *
 * Heights used to be cached in a plain array indexed by position, which is only
 * correct while positions are stable. Prepend a single item to a virtualized
 * list and every cached height shifts onto the wrong item: the layout is then
 * computed from heights belonging to somebody else, and the items that would
 * reveal the error are exactly the ones virtualization has removed from the
 * DOM, so nothing re-measures them.
 *
 * Keying by the caller's `getItemKey` fixes that at the source — a height
 * follows its item through reorders, filters, and prepends. Without
 * `getItemKey` the key *is* the index, which reproduces the old behaviour
 * exactly; that is the documented reason for recommending the option whenever
 * items can move.
 */

/** Item identity. `bigint` is included because React's `Key` allows it. */
export type ItemKey = string | number | bigint;

export interface HeightCache {
  /** Measured height for a key, or `undefined` if it has never been measured. */
  get(key: ItemKey): number | undefined;
  /** Record a measured height. Non-positive values are ignored. */
  set(key: ItemKey, height: number): void;
  /** Heights for `keys`, in order, with `undefined` where unmeasured. */
  read(keys: readonly ItemKey[]): (number | undefined)[];
  /**
   * Drop every entry whose key is absent from `keys`, so a long-lived grid
   * does not accumulate heights for items that are gone.
   *
   * @returns how many entries were dropped.
   */
  retain(keys: readonly ItemKey[]): number;
  /** Forget everything — used when the column width changes and every measurement is stale. */
  clear(): void;
  /** Number of cached heights. */
  readonly size: number;
}

export function createHeightCache(): HeightCache {
  const heights = new Map<ItemKey, number>();

  return {
    get(key) {
      return heights.get(key);
    },

    set(key, height) {
      // A zero height means "not laid out yet", not "measured as empty".
      // Storing it would make the item look measured and freeze it at zero.
      if (height > 0) heights.set(key, height);
    },

    read(keys) {
      return keys.map((key) => heights.get(key));
    },

    retain(keys) {
      if (heights.size === 0) return 0;

      const keep = new Set<ItemKey>(keys);
      let dropped = 0;

      // Deleting during iteration is well-defined for Map: entries already
      // visited are not revisited, and no entry is skipped.
      heights.forEach((_, key) => {
        if (!keep.has(key)) {
          heights.delete(key);
          dropped++;
        }
      });

      return dropped;
    },

    clear() {
      heights.clear();
    },

    get size() {
      return heights.size;
    },
  };
}
