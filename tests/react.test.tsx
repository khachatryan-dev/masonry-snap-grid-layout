import { render } from '@testing-library/react';
import MasonrySnapGrid from '../src/react';
import { describe, it } from 'vitest';

describe('React Integration', () => {
  it('renders component without crashing', () => {
    render(
      <MasonrySnapGrid
        items={[{ id: 1 }]}
        renderItem={() => document.createElement('div')}
      />
    );
  });
});