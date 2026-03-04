import '@testing-library/jest-dom';

// jsdom does not implement layout, so offsetWidth/offsetHeight return 0.
// Patch HTMLElement to return predictable non-zero values for layout tests.
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() {
    return parseInt(this.style.width, 10) || 800;
  },
});

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() {
    return parseInt(this.style.height, 10) || 200;
  },
});

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    return parseInt(this.style.width, 10) || 800;
  },
});
