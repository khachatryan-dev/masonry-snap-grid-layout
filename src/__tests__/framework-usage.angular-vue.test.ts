import { describe, it, expect } from 'vitest';
import MasonrySnapGridLayout from '../MasonrySnapGridLayout';
import type { MasonrySnapGridLayoutOptions } from '../types';

interface Card {
  id: number;
  title: string;
  color: string;
}

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', {
    value: 800,
    configurable: true,
  });
  document.body.appendChild(container);
  return container;
}

describe('Framework-style usage (Angular/Vue patterns)', () => {
  it('can be used with an Angular-like component pattern', () => {
    const container = createContainer();
    const cards: Card[] = [
      { id: 1, title: 'Card 1', color: '#FF9A9E' },
      { id: 2, title: 'Card 2', color: '#A1C4FD' },
    ];

    // Simulate Angular lifecycle: ngAfterViewInit / ngOnDestroy
    const options: MasonrySnapGridLayoutOptions<Card> = {
      items: cards,
      gutter: 16,
      minColWidth: 220,
      layoutMode: 'js',
      renderItem: (card) => {
        const el = document.createElement('div');
        el.textContent = card.title;
        el.style.height = '160px';
        el.style.background = card.color;
        return el;
      },
    };

    const layout = new MasonrySnapGridLayout(container, options);
    expect(container.children.length).toBe(cards.length);
    layout.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('can be used with a Vue-like composition pattern', () => {
    const container = createContainer();
    const cards: Card[] = [
      { id: 1, title: 'Card 1', color: '#FF9A9E' },
      { id: 2, title: 'Card 2', color: '#A1C4FD' },
    ];

    // Simulate Vue onMounted / onBeforeUnmount lifecycle
    const options: MasonrySnapGridLayoutOptions<Card> = {
      items: cards,
      gutter: 12,
      minColWidth: 200,
      layoutMode: 'js',
      renderItem: (card) => {
        const el = document.createElement('div');
        el.textContent = card.title;
        el.style.height = '140px';
        el.style.background = card.color;
        return el;
      },
    };

    const layout = new MasonrySnapGridLayout(container, options);
    expect(container.children.length).toBe(cards.length);

    layout.updateItems([...cards, { id: 3, title: 'Card 3', color: '#FBC2EB' }]);
    expect(container.children.length).toBe(3);

    layout.destroy();
    expect(container.innerHTML).toBe('');
  });
});

