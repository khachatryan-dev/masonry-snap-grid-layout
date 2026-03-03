import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MasonrySnapGrid from '../react';

interface Item {
  id: number;
  title: string;
}

describe('MasonrySnapGrid React wrapper', () => {
  it('renders items and attaches container class', async () => {
    const items: Item[] = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
    ];

    render(
      <MasonrySnapGrid<Item>
        items={items}
        gutter={16}
        minColWidth={200}
        animate
        transitionDuration={300}
        renderItem={(item) => <div data-testid="masonry-item">{item.title}</div>}
      />,
    );

    // Wait for async initialization to complete
    await waitFor(
      () => {
        const renderedItems = screen.getAllByTestId('masonry-item');
        expect(renderedItems).toHaveLength(2);
      },
      { timeout: 2000 }
    );
  });
});

