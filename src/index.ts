import './index.css'; // Base CSS styles for MasonrySnapGridLayout
import MasonrySnapGridLayout from './MasonrySnapGridLayout';
import { MasonrySnapGridLayoutOptions } from './types';

/**
 * Entry point for the MasonrySnapGridLayout package.
 *
 * - Imports the default styles for the layout (`index.css`).
 * - Re-exports the core class and associated type definitions.
 * - This allows consumers to either:
 *    - Import the default class directly.
 *    - Or import named exports for more flexibility.
 */

export default MasonrySnapGridLayout;
export type {
    MasonrySnapGridLayout,
    MasonrySnapGridLayoutOptions
};
