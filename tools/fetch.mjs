// fetch.mjs <versionName...> — pull one or more std-library versions into ./staged/<name>/.
// Resolves version NAMES (e.g. 3050) to ids dynamically, so it works for future releases.
// Files are written in final form (versions stripped, trailing blank line) ready for apply.mjs.
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DID, STAGE_DIR, stripVersions, openSession, api } from './lib.mjs';

const wanted = process.argv.slice(2);
if (!wanted.length) {
  console.log('Usage: node fetch.mjs <versionName...>   e.g.  node fetch.mjs 3050 3051');
  console.log('Tip: run  node fetch.mjs --list  to see the newest available versions.');
  process.exit(1);
}

const { browser, page } = await openSession();
try {
  const versions = (await api(page, `/api/v14/documents/d/${DID}/versions`)).body || [];
  const norm = (n) => String(n).replace(/\.0$/, '');
  const byName = new Map(versions.map((v) => [norm(v.name), v]));

  if (wanted[0] === '--list') {
    console.log('Newest versions:');
    for (const v of versions.slice(-12)) console.log(`  ${v.name}`);
    process.exit(0);
  }

  for (const name of wanted) {
    const v = byName.get(norm(name));
    if (!v) { console.log(`! version "${name}" not found`); continue; }

    const elements = ((await api(page, `/api/v14/documents/d/${DID}/v/${v.id}/elements?withThumbnails=false`)).body || [])
      .filter((e) => /featurestudio/i.test(e.dataType || '') || /FEATURESTUDIO/i.test(e.elementType || ''));

    const dir = join(STAGE_DIR, norm(name));
    await mkdir(dir, { recursive: true });
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.fs'))) await rm(join(dir, f));

    let ok = 0; const failed = [];
    for (let i = 0; i < elements.length; i += 12) {
      const batch = elements.slice(i, i + 12);
      const res = await page.evaluate(async ({ did, vid, batch }) => {
        const one = async (el) => {
          for (let a = 0; a < 3; a++) {
            try {
              const r = await fetch(`/api/v14/featurestudios/d/${did}/v/${vid}/e/${el.id}`, { credentials: 'same-origin', headers: { accept: 'application/json' } });
              if (r.status === 200) { const b = await r.json(); return { name: el.name, contents: b.contents }; }
              if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 500 * (a + 1))); continue; }
              return { name: el.name, error: r.status };
            } catch { await new Promise((x) => setTimeout(x, 500 * (a + 1))); }
          }
          return { name: el.name, error: 'retries-exhausted' };
        };
        return Promise.all(batch.map(one));
      }, { did: DID, vid: v.id, batch });

      for (const r of res) {
        if (typeof r.contents === 'string') { await writeFile(join(dir, r.name), stripVersions(r.contents) + '\n'); ok++; }
        else failed.push(`${r.name} (${r.error})`);
      }
      process.stdout.write(`\r  ${norm(name)}: ${ok}/${elements.length}   `);
    }
    console.log(`\n${norm(name)}: ${ok} modules staged -> ${dir}${failed.length ? `  (${failed.length} failed: ${failed.join(', ')})` : ''}`);
  }
} finally {
  await browser.close();
}
