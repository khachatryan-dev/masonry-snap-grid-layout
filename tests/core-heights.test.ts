import { describe, it, expect } from "vitest";
import { createHeightCache } from "../src/core/model/heights";
import { computeLayout } from "../src/core/model/layout";

describe("createHeightCache", () => {
  it("reads back what it stored, in the order of the keys given", () => {
    const cache = createHeightCache();
    cache.set("a", 100);
    cache.set("b", 250);

    expect(cache.read(["b", "a"])).toEqual([250, 100]);
  });

  it("reports unmeasured keys as undefined rather than zero", () => {
    // The distinction matters: `undefined` means "must be rendered to be
    // measured", while 0 would look like a measured, empty item.
    const cache = createHeightCache();
    cache.set("a", 100);

    expect(cache.read(["a", "b"])).toEqual([100, undefined]);
  });

  it("ignores non-positive heights", () => {
    // An unmounted or not-yet-laid-out element reports 0. Caching that would
    // freeze the item at zero height forever.
    const cache = createHeightCache();
    cache.set("a", 0);
    cache.set("b", -5);

    expect(cache.size).toBe(0);
  });

  it("drops entries for keys that are gone", () => {
    const cache = createHeightCache();
    cache.set("a", 100);
    cache.set("b", 200);
    cache.set("c", 300);

    expect(cache.retain(["a", "c"])).toBe(1);
    expect(cache.size).toBe(2);
    expect(cache.get("b")).toBeUndefined();
  });

  it("keeps heights attached to their item when the list is prepended to", () => {
    // This is the whole point of keying by identity. With an index-based cache
    // the heights below would shift onto the wrong items.
    const cache = createHeightCache();
    cache.set("a", 100);
    cache.set("b", 200);
    cache.set("c", 300);

    expect(cache.read(["new", "a", "b", "c"])).toEqual([
      undefined,
      100,
      200,
      300,
    ]);
  });

  it("clear() forgets everything", () => {
    const cache = createHeightCache();
    cache.set("a", 100);
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.read(["a"])).toEqual([undefined]);
  });
});

describe("height cache feeding computeLayout", () => {
  it("places prepended items without disturbing the heights of existing ones", () => {
    const cache = createHeightCache();
    // A single column keeps the arithmetic obvious: y is a running total.
    cache.set("a", 100);
    cache.set("b", 300);

    const before = computeLayout({
      count: 2,
      heights: cache.read(["a", "b"]),
      containerWidth: 300,
      gutter: 0,
      minColWidth: 300,
    });
    expect(before.positions.map((p) => p.y)).toEqual([0, 100]);

    // Prepend `z`, still unmeasured. `a` and `b` must keep their own heights.
    const after = computeLayout({
      count: 3,
      heights: cache.read(["z", "a", "b"]),
      containerWidth: 300,
      gutter: 0,
      minColWidth: 300,
      fallbackHeight: 50,
    });
    expect(after.positions.map((p) => p.y)).toEqual([0, 50, 150]);
  });
});
