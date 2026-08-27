/**
 * Feature detection for optional browser capabilities.
 */

/**
 * Safely check if the browser supports a CSS feature.
 *
 * Wrapped in a try/catch because `CSS.supports` throws on a malformed
 * declaration in some engines, and returns nothing useful during SSR.
 */
export function supportsCss(property: string, value: string): boolean {
  try {
    return typeof CSS !== 'undefined' && CSS.supports(property, value);
  } catch {
    return false;
  }
}
