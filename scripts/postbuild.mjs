/**
 * Post-build script: copies the CSS stylesheet to dist/style.css.
 *
 * Run automatically after `vite build` via the "build" npm script.
 *
 * The script is intentionally cross-platform and uses Node's path utilities
 * instead of hard-coded path separators.
 */

import { copyFile, mkdir, access } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');

const source = join(root, 'src', 'styles', 'style.css');
const destinationDir = join(root, 'dist');
const destination = join(destinationDir, 'style.css');

try {
  // Make sure dist/ exists.
  await mkdir(destinationDir, {
    recursive: true,
  });

  // Fail with a clear message if the source stylesheet is missing.
  try {
    await access(source);
  } catch {
    throw new Error(`Source stylesheet not found: ${source}`);
  }

  // Copy the stylesheet into the published dist directory.
  await copyFile(source, destination);

  console.log('✓ Copied src/styles/style.css → dist/style.css');
} catch (error) {
  console.error('✗ Failed to copy stylesheet');

  if (error instanceof Error) {
    console.error(`  ${error.message}`);
  } else {
    console.error(error);
  }

  process.exit(1);
}
