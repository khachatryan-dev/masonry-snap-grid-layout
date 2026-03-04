import { describe, it, expect } from 'vitest';
import { getColumnCount } from '../src/core/utils';

describe('Core Utilities', () => {
  it('returns 1 column when width is zero', () => {
    expect(getColumnCount(0, 250, 16)).toBe(1);
  });

  it('calculates multiple columns correctly', () => {
    const cols = getColumnCount(1200, 250, 16);
    expect(cols).toBeGreaterThan(1);
  });
});