// lib.mjs — shared helpers for the Onshape std-library browser-session updater.
// Auth is ONLY ever a logged-in browser session (session cookie). No API key, no OAuth app,
// nothing that counts against the Onshape API quota. No secrets are stored in source.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// Public Onshape standard-library document. Not a secret.
export const DID = '12312312345abcabcabcdeff';

// Session state (cookies) — gitignored, never committed. Delete to force a fresh login.
export const AUTH_FILE = join(HERE, '.auth', 'onshape-state.json');
export const STAGE_DIR = join(HERE, 'staged');

// Match the mirror convention: strip release version numbers to the ✨ placeholder.
export function stripVersions(source) {
  return source
    .replace(/^FeatureScript \d+;/, 'FeatureScript ✨;')
    .replace(/(version\s*:\s*)"\d+(?:\.\d+)?"/g, '$1"✨"');
}

// Same-origin fetch run inside the page, so it rides the session cookie.
export const api = (page, path) => page.evaluate(async (p) => {
  const r = await fetch(p, { credentials: 'same-origin', headers: { accept: 'application/json' } });
  return { status: r.status, body: await r.json().catch(() => null) };
}, path);

// Open a headed browser backed by a live Onshape session. Reuses a saved session if valid;
// otherwise waits for you to log in by hand (email / SSO / 2FA). Nothing is automated or stored
// beyond the resulting session cookie in AUTH_FILE.
export async function openSession({ loginTimeoutMs = 6 * 60_000 } = {}) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {});
  const page = await context.newPage();

  const status = () => page.evaluate(async () => {
    try { const r = await fetch('/api/v14/users/session', { credentials: 'same-origin', headers: { accept: 'application/json' } }); return r.status; }
    catch { return 0; }
  });

  await page.goto('https://cad.onshape.com/documents', { waitUntil: 'domcontentloaded' });
  if ((await status()) !== 200) {
    console.log('Log in to Onshape in the window; I resume automatically once authenticated...');
    const deadline = Date.now() + loginTimeoutMs;
    while (Date.now() < deadline && (await status()) !== 200) await page.waitForTimeout(2000);
  }
  if ((await status()) !== 200) { await browser.close(); throw new Error('Not authenticated within the time limit.'); }

  await mkdir(dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  console.log('Authenticated.');
  return { browser, context, page };
}
