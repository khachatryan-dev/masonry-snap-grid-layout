/**
 * Post-build script: copies the CSS stylesheet to dist/style.css.
 * Run automatically after `vite build` via the "build" npm script.
 */
import { copyFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

await mkdir(join(root, 'dist'), { recursive: true });
await copyFile(
  join(root, 'src', 'styles', 'style.css'),
  join(root, 'dist', 'style.css')
);

console.log('✓ Copied src/styles/style.css → dist/style.css');
