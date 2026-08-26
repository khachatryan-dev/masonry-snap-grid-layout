/**
 * Architecture boundary check.
 *
 * The layout algorithm once existed in three divergent copies, which is why a
 * scroll fix landed in React and silently never reached Vue. The structural fix
 * was a single shared core — but structure decays unless something enforces it.
 * This script is that something.
 *
 * It resolves every relative import under `src/` (including inside `.vue`
 * single-file components, which ESLint does not parse here) and checks it
 * against the declared layer graph below. It also fails on import cycles.
 *
 * Run via `npm run check:arch`, and in CI as part of `npm run verify`.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { dirname, join, relative, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/**
 * Declared architecture. `may` lists the only layers a layer can import from.
 * Dependencies point strictly inward — nothing may import an adapter.
 */
const LAYERS = [
  {
    name: 'core/model',
    match: (p) => p.startsWith('core/model/'),
    may: ['core/model'],
    why: 'Pure logic. No DOM, no globals, no browser primitives — that is what makes it trivially testable and environment-independent.',
  },
  {
    name: 'core/lib',
    match: (p) => p.startsWith('core/lib/'),
    may: ['core/model', 'core/lib'],
    why: 'Browser primitives (observers, scroll, frame scheduling). May use the model, never the DOM-writing engine.',
  },
  {
    name: 'core/engine',
    match: (p) => p.startsWith('core/engine/'),
    may: ['core/model', 'core/lib', 'core/engine'],
    why: 'Imperative DOM writers for the Vanilla engine.',
  },
  {
    name: 'core/api',
    match: (p) => p === 'core/index.ts',
    may: ['core/model', 'core/lib', 'core/engine'],
    why: "The core's public API barrel. The only module allowed to re-export from every core segment.",
  },
  {
    name: 'vanilla',
    match: (p) => p.startsWith('vanilla/'),
    may: ['core/api', 'vanilla'],
    why: 'Vanilla adapter. Consumes the core only through its public API.',
  },
  {
    name: 'react',
    match: (p) => p.startsWith('react/'),
    may: ['core/api', 'react'],
    why: 'React adapter. Consumes the core only through its public API.',
  },
  {
    name: 'vue',
    match: (p) => p.startsWith('vue/'),
    may: ['core/api', 'vue'],
    why: 'Vue adapter. Consumes the core only through its public API.',
  },
  {
    name: 'angular',
    match: (p) => p.startsWith('angular/'),
    // Angular deliberately composes the Vanilla engine rather than
    // reimplementing it; that is the one permitted adapter-to-adapter edge.
    may: ['core/api', 'vanilla', 'angular'],
    why: 'Angular adapter. Wraps the Vanilla engine, and reads the core through its public API.',
  },
  {
    name: 'entry',
    match: (p) => p === 'index.ts',
    may: ['core/api', 'vanilla'],
    why: 'Package entry point.',
  },
];

const layerOf = (rel) => LAYERS.find((l) => l.match(rel))?.name ?? null;

// ── collect source files ──────────────────────────────────────────────────────
const EXT = new Set(['.ts', '.tsx', '.vue']);
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (EXT.has(extname(e.name)) && !e.name.endsWith('.d.ts'))
      files.push(full);
  }
})(SRC);

// ── resolve relative imports ──────────────────────────────────────────────────
const CANDIDATES = (b) => [
  b,
  `${b}.ts`,
  `${b}.tsx`,
  `${b}.vue`,
  join(b, 'index.ts'),
  join(b, 'index.tsx'),
];

const resolveSpec = (fromFile, spec) => {
  const base = resolve(dirname(fromFile), spec);
  for (const c of CANDIDATES(base)) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

const IMPORT_RE = /(?:from|import)\s*["'](\.[^"']+)["']/g;

const edges = [];
const violations = [];
const unresolved = [];

for (const file of files) {
  const rel = relative(SRC, file);
  const layer = layerOf(rel);
  if (!layer) {
    violations.push({
      file: rel,
      msg: 'file is not covered by any declared layer',
    });
    continue;
  }

  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[1];
    const target = resolveSpec(file, spec);
    if (!target) {
      unresolved.push({ file: rel, spec });
      continue;
    }
    const targetRel = relative(SRC, target);
    const targetLayer = layerOf(targetRel);
    edges.push([rel, targetRel]);

    const allowed = LAYERS.find((l) => l.name === layer).may;
    if (!targetLayer || !allowed.includes(targetLayer)) {
      violations.push({
        file: rel,
        msg: `imports "${spec}" (${targetLayer ?? 'unknown layer'}) — ${layer} may only import: ${allowed.join(', ')}`,
      });
    }
  }
}

// ── cycle detection ───────────────────────────────────────────────────────────
const graph = new Map();
for (const [from, to] of edges) {
  if (!graph.has(from)) graph.set(from, []);
  graph.get(from).push(to);
}

const cycles = [];
const WHITE = 0,
  GREY = 1,
  BLACK = 2;
const state = new Map();
const stack = [];

const visit = (node) => {
  state.set(node, GREY);
  stack.push(node);
  for (const next of graph.get(node) ?? []) {
    const s = state.get(next) ?? WHITE;
    if (s === GREY) {
      cycles.push([...stack.slice(stack.indexOf(next)), next].join(' -> '));
    } else if (s === WHITE) {
      visit(next);
    }
  }
  stack.pop();
  state.set(node, BLACK);
};
for (const node of new Set(edges.map(([f]) => f))) {
  if ((state.get(node) ?? WHITE) === WHITE) visit(node);
}

// ── report ────────────────────────────────────────────────────────────────────
console.log('\nArchitecture boundaries\n');
for (const l of LAYERS) {
  const count = files.filter((f) => layerOf(relative(SRC, f)) === l.name).length;
  const arrow = l.may.filter((m) => m !== l.name);
  console.log(
    `  ${l.name.padEnd(12)} ${String(count).padStart(2)} file(s)  ->  ${arrow.length ? arrow.join(', ') : '(nothing)'}`
  );
}
console.log(
  `\n  ${files.length} files, ${edges.length} internal import(s) checked`
);

if (unresolved.length) {
  console.log('\n  Unresolved relative imports:');
  for (const u of unresolved) console.log(`    ? ${u.file} -> ${u.spec}`);
}

let failed = false;

if (cycles.length) {
  failed = true;
  console.error('\n✗ import cycle(s) detected:\n');
  for (const c of [...new Set(cycles)]) console.error(`    ${c}`);
}

if (violations.length) {
  failed = true;
  console.error('\n✗ boundary violation(s):\n');
  for (const v of violations) console.error(`    ${v.file}\n      ${v.msg}`);
  console.error(
    '\n  Adapters must consume the core through src/core/index.ts, and core'
  );
  console.error('  layers must depend strictly inward: engine -> lib -> model.\n');
}

if (failed) process.exit(1);
console.log('\n✓ all layer boundaries respected, no cycles\n');
