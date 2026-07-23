// apply.mjs <versionName> [targetDir] — copy a staged version into the mirror (default: repo root),
// replacing the existing *.fs so removed modules disappear too. Then commit.
import { readdir, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE_DIR } from './lib.mjs';

const [version, target] = process.argv.slice(2);
if (!version) {
  console.log('Usage: node apply.mjs <versionName> [targetDir]   (default target = repo root)');
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const dest = resolve(target || join(HERE, '..'));   // parent of tools/ = the mirror repo root
const src = join(STAGE_DIR, String(version).replace(/\.0$/, ''));

const staged = (await readdir(src)).filter((f) => f.endsWith('.fs'));
if (!staged.length) { console.log(`! nothing staged for ${version}; run: node fetch.mjs ${version}`); process.exit(1); }

await mkdir(dest, { recursive: true });
for (const f of (await readdir(dest)).filter((f) => f.endsWith('.fs'))) await rm(join(dest, f));
for (const f of staged) await writeFile(join(dest, f), await readFile(join(src, f), 'utf8'));

console.log(`applied ${version}: ${staged.length} modules -> ${dest}`);
console.log(`next: git -C "${dest}" add -A && git -C "${dest}" commit -m "Standard library ${version}"`);
