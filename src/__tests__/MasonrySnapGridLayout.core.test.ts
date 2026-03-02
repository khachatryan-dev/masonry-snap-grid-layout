import { describe, it, expect, beforeEach } from 'vitest';
import MasonrySnapGridLayout from '../MasonrySnapGridLayout';
import type { MasonrySnapGridLayoutOptions } from '../types';

function createContainer(width = 800): HTMLElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', {
    value: width,
    configurable: true,
  });
  document.body.appendChild(container);
  return container;
}

function createOptions(count = 5): MasonrySnapGridLayoutOptions<{ id: number }> {
  const items = Array.from({ length: count }, (_, i) => ({ id: i }));
  return {
    items,
    gutter: 16,
    minColWidth: 200,
    layoutMode: 'js',
    renderItem: (item) => {
      const el = document.createElement('div');
      el.textContent = `Item ${item.id}`;
      // give each item some height for layout
      el.style.height = `${100 + item.id * 10}px`;
      return el;
    },
  };
}

describe('MasonrySnapGridLayout (core JS engine)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates items and applies transforms in JS mode', () => {
    const container = createContainer();
    const options = createOptions(3);

    const layout = new MasonrySnapGridLayout(container, options);

    // items should be attached to the container
    const children = Array.from(container.children) as HTMLElement[];
    expect(children.length).toBe(3);

    // after layout, items should have a transform applied
    children.forEach((child) => {
      expect(child.style.transform).toContain('translate3d');
    });

    layout.destroy();
  });

  it('updates items via updateItems', () => {
    const container = createContainer();
    const options = createOptions(2);

    const layout = new MasonrySnapGridLayout(container, options);
    expect(container.children.length).toBe(2);

    const newItems = Array.from({ length: 4 }, (_, i) => ({ id: i }));
    layout.updateItems(newItems);

    expect(container.children.length).toBe(4);
    layout.destroy();
  });

  it('handles zero-width containers gracefully', () => {
    const container = createContainer(0);
    const options = createOptions(2);

    const layout = new MasonrySnapGridLayout(container, options);
    expect(container.style.height).toBe('0px');
    layout.destroy();
  });

  it('sets container height based on tallest column', () => {
    const container = createContainer(400);
    const options = createOptions(4);

    const layout = new MasonrySnapGridLayout(container, options);

    // height should be non-empty after layout
    expect(container.style.height).not.toBe('');

    layout.destroy();
  });

  it('destroys cleanly', () => {
    const container = createContainer();
    const options = createOptions(3);

    const layout = new MasonrySnapGridLayout(container, options);
    layout.destroy();

    expect(container.innerHTML).toBe('');
    expect(container.getAttribute('style')).toBeNull();
  });
});

