/**
 * Bundle size gate.
 *
 * Reports the cost of each public entry point *including* the shared chunks it
 * pulls in, so the numbers reflect what a consumer actually downloads rather
 * than the size of one file in isolation.
 *
 * The budget is enforced on **minified + gzipped** size, because that is what
 * consumers ship: `dist/` is published unminified (readable in node_modules,
 * and every bundler minifies it anyway), so raw gzip overstates the real cost
 * by roughly 40%. It is also the figure bundlephobia's badge reports, so the
 * README and the badge cannot disagree.
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

/** Follow relative `import`/`export … from` specifiers transitively. */
async function collectGraph(entry, seen = new Set()) {
  const abs = resolve(entry);
  if (seen.has(abs)) return seen;
  seen.add(abs);
  if (extname(abs) !== '.js') return seen;

  const source = await readFile(abs, 'utf8');
  for (const m of source.matchAll(/from\s*["'](\.[^"']+)["']/g)) {
    const target = resolve(dirname(abs), m[1]);
    try {
      await stat(target);
      await collectGraph(target, seen);
    } catch {
      // Bare or external specifier — not ours to measure.
    }
  }
  return seen;
}

const gzip = (buf) => gzipSync(buf, { level: 9 }).length;
const brotli = (buf) =>
  brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

async function minify(source, loader) {
  const { code } = await transform(source, { minify: true, loader });
  return Buffer.from(code);
}

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
const pad = (s, n) => String(s).padEnd(n);

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

  const isJs = entry.endsWith('.js');
  const files = isJs ? [...(await collectGraph(entryPath))] : [entryPath];

  let raw = 0;
  let gz = 0;
  let minGz = 0;
  let minBr = 0;

  for (const file of files) {
    const source = await readFile(file);
    raw += source.length;
    gz += gzip(source);
    const min = await minify(source.toString(), isJs ? 'js' : 'css');
    minGz += gzip(min);
    minBr += brotli(min);
  }

  const over = minGz > budget;
  if (over) failed = true;

  rows.push({ entry, raw, gz, minGz, minBr, budget, chunks: files.length, over });
}

console.log('\nBundle size per entry point, including shared chunks\n');
console.log(
  `  ${pad('entry', 18)} ${pad('raw', 10)} ${pad('gzip', 10)} ${pad('min+gzip', 10)} ${pad('min+br', 10)} ${pad('budget', 9)} chunks  status`
);
console.log(`  ${'-'.repeat(92)}`);
for (const r of rows) {
  console.log(
    `  ${pad(r.entry, 18)} ${pad(kb(r.raw), 10)} ${pad(kb(r.gz), 10)} ${pad(kb(r.minGz), 10)} ${pad(kb(r.minBr), 10)} ${pad(kb(r.budget), 9)} ${pad(r.chunks, 7)} ${r.over ? 'OVER' : 'ok'}`
  );
}
console.log(
  '\n  Budget applies to min+gzip — what consumers ship after their own minifier.'
);
console.log('  raw is what a CDN serves directly, since dist/ is unminified.\n');

if (failed) {
  console.error('✗ bundle size budget exceeded\n');
  process.exit(1);
}
console.log('✓ all entries within budget\n');
