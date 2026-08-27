/**
 * Published-package integrity check.
 *
 * Packs the tarball, extracts it, and verifies that everything the `exports`
 * map advertises actually resolves from *inside the published package* — not
 * merely from the working tree.
 *
 * This exists because the `./angular` entry shipped broken for several
 * releases: it publishes TypeScript source that imports `../core/*`, but
 * `files` did not include `src/core`, so the import was unresolvable for every
 * consumer. Nothing in the working tree could reveal that, because the source
 * is right there locally — only the tarball tells the truth.
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const work = mkdtempSync(join(tmpdir(), 'msgl-pack-'));
let failures = 0;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures++;
};

try {
  const output = execFileSync('npm', ['pack', root, '--silent'], {
    cwd: work,
    encoding: 'utf8',
  });
  const tarball = output.trim().split('\n').pop().trim();

  execFileSync('tar', ['-xzf', tarball], { cwd: work });
  const pub = join(work, 'package');

  console.log('\nPublished package integrity\n');

  // ── 1. Every exports target must exist in the tarball ──────────────────────
  const targets = new Set();
  const walkExports = (node) => {
    if (typeof node === 'string') return targets.add(node);
    if (node && typeof node === 'object') Object.values(node).forEach(walkExports);
  };
  walkExports(pkg.exports ?? {});
  for (const field of ['main', 'module', 'types']) {
    if (pkg[field]) targets.add(pkg[field]);
  }

  for (const target of [...targets].sort()) {
    const abs = join(pub, target);
    if (existsSync(abs)) console.log(`  ✓ ${target}`);
    else fail(`declared in package.json but missing from the tarball: ${target}`);
  }

  // ── 2. Relative imports in published source must resolve ───────────────────
  // Source-shipping entries (the Angular component) compile in the consumer's
  // build, so a dangling relative import breaks them at install time.
  const sourceFiles = [];
  const walkDir = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) walkDir(full);
      else if (['.ts', '.tsx', '.js', '.mjs'].includes(extname(name.name))) {
        sourceFiles.push(full);
      }
    }
  };
  walkDir(join(pub, 'src'));

  const candidates = (base) => [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.js'),
  ];

  let checked = 0;
  for (const file of sourceFiles) {
    const code = readFileSync(file, 'utf8');
    const specs = [...code.matchAll(/(?:from|import)\s*["'](\.[^"']+)["']/g)].map(
      (m) => m[1]
    );

    for (const spec of specs) {
      checked++;
      const base = resolve(dirname(file), spec);
      if (!candidates(base).some(existsSync)) {
        fail(
          `${file.replace(pub + '/', '')} imports "${spec}", which is not published`
        );
      }
    }
  }
  console.log(
    `  ✓ ${checked} relative import(s) across ${sourceFiles.length} published source file(s) resolve`
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n✗ published package is broken (${failures} problem(s))\n`);
  process.exit(1);
}
console.log('\n✓ published package is self-consistent\n');
