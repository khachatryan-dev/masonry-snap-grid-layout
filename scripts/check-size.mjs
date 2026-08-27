/**
 * Bundle size gate.
 *
 * Reports the cost of each public entry point *including* the shared chunks it
 * pulls in, so the numbers reflect what a consumer actually downloads rather
 * than the size of one file in isolation.
 *
 * The budget is enforced on minified + gzipped size. The package publishes
 * readable/unminified dist files, while consumers commonly minify the final
 * application bundle.
 *
 * Budgets are deliberately generous — this catches regressions, not bytes.
 */

import { readFile, stat } from 'fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'zlib';
import { dirname, join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { transform } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/** Minified + gzipped byte budget per entry, including its shared chunks. */
const BUDGETS = {
  'index.js': 6 * 1024,
  'react/index.js': 6 * 1024,
  'vue/index.js': 6 * 1024,
  'style.css': 2 * 1024,
};

/**
 * Resolve a relative JavaScript import to an actual file.
 *
 * Generated bundles may contain extensionless imports such as:
 *
 *   ./core/index
 *
 * while the actual file is:
 *
 *   ./core/index.js
 *
 * We therefore try the common JavaScript resolution patterns.
 */
async function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const base = resolve(dirname(fromFile), specifier);

  const candidates = [
    base,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    join(base, 'index.js'),
    join(base, 'index.mjs'),
    join(base, 'index.cjs'),
  ];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);

      if (info.isFile()) {
        return candidate;
      }
    } catch {
      // Candidate does not exist. Try the next one.
    }
  }

  return null;
}

/**
 * Follow relative imports transitively.
 *
 * Handles:
 *
 *   import x from './foo'
 *   import './foo'
 *   export { x } from './foo'
 *   export * from './foo'
 *   import('./foo')
 */
async function collectGraph(entry, seen = new Set()) {
  const abs = resolve(entry);

  if (seen.has(abs)) {
    return seen;
  }

  seen.add(abs);

  if (!['.js', '.mjs', '.cjs'].includes(extname(abs))) {
    return seen;
  }

  const source = await readFile(abs, 'utf8');

  const specifiers = new Set();

  // Static imports and exports.
  const staticImportRegex =
    /(?:import\s*(?:[\s\S]*?\s+from\s*)?|export\s+(?:[\s\S]*?\s+from\s*))["'](\.[^"']+)["']/g;

  for (const match of source.matchAll(staticImportRegex)) {
    specifiers.add(match[1]);
  }

  // Side-effect imports:
  //
  // import './foo'
  const sideEffectImportRegex = /import\s*["'](\.[^"']+)["']/g;

  for (const match of source.matchAll(sideEffectImportRegex)) {
    specifiers.add(match[1]);
  }

  // Dynamic imports:
  //
  // import('./foo')
  const dynamicImportRegex = /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;

  for (const match of source.matchAll(dynamicImportRegex)) {
    specifiers.add(match[1]);
  }

  for (const specifier of specifiers) {
    const target = await resolveRelativeImport(abs, specifier);

    if (!target) {
      // Bare/external specifier or unresolved generated import.
      // There is nothing local for this checker to measure.
      continue;
    }

    await collectGraph(target, seen);
  }

  return seen;
}

const gzip = (buf) =>
  gzipSync(buf, {
    level: 9,
  }).length;

const brotli = (buf) =>
  brotliCompressSync(buf, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).length;

async function minify(source, loader) {
  const { code } = await transform(source, {
    minify: true,
    loader,
  });

  return Buffer.from(code);
}

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const pad = (value, length) => String(value).padEnd(length);

let failed = false;
const rows = [];

for (const [entry, budget] of Object.entries(BUDGETS)) {
  const entryPath = join(dist, entry);

  try {
    await stat(entryPath);
  } catch {
    console.error(`✗ missing build output: dist/${entry}`);
    failed = true;
    continue;
  }

  const isJs = ['.js', '.mjs', '.cjs'].includes(extname(entry));

  const files = isJs ? [...(await collectGraph(entryPath))] : [entryPath];

  let raw = 0;
  let gz = 0;
  let minGz = 0;
  let minBr = 0;

  for (const file of files) {
    const source = await readFile(file);

    raw += source.length;
    gz += gzip(source);

    const min = await minify(source.toString('utf8'), isJs ? 'js' : 'css');

    minGz += gzip(min);
    minBr += brotli(min);
  }

  const over = minGz > budget;

  if (over) {
    failed = true;
  }

  rows.push({
    entry,
    raw,
    gz,
    minGz,
    minBr,
    budget,
    chunks: files.length,
    over,
  });
}

console.log('\nBundle size per entry point, including shared chunks\n');

console.log(
  `  ${pad('entry', 18)} ` +
    `${pad('raw', 10)} ` +
    `${pad('gzip', 10)} ` +
    `${pad('min+gzip', 10)} ` +
    `${pad('min+br', 10)} ` +
    `${pad('budget', 9)} ` +
    `chunks  status`
);

console.log(`  ${'-'.repeat(92)}`);

for (const row of rows) {
  console.log(
    `  ${pad(row.entry, 18)} ` +
      `${pad(kb(row.raw), 10)} ` +
      `${pad(kb(row.gz), 10)} ` +
      `${pad(kb(row.minGz), 10)} ` +
      `${pad(kb(row.minBr), 10)} ` +
      `${pad(kb(row.budget), 9)} ` +
      `${pad(row.chunks, 7)} ` +
      `${row.over ? 'OVER' : 'ok'}`
  );
}

console.log('\n  Budget applies to min+gzip.');

console.log('  Shared JavaScript chunks are followed transitively.');

console.log('  raw is the unminified size of the published files.\n');

if (failed) {
  console.error('✗ bundle size budget exceeded\n');
  process.exit(1);
}

console.log('✓ all entries within budget\n');
