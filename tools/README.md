# std-library updater

Updates this mirror by reading the Onshape FeatureScript standard library through a **logged-in
browser session** (Playwright) — the same requests the Onshape web app makes. It uses **no developer
API key and no OAuth app**, so it does not consume the annual Onshape API quota (per Onshape's
[API limits](https://onshape-public.github.io/docs/auth/limits/), browser/session calls are not counted).

## Use

```bash
npm install                 # installs Playwright + Chromium (one time)
node fetch.mjs --list       # see the newest available versions
node fetch.mjs 3050         # log in once in the window, then it pulls version 3050 into ./staged/3050
node apply.mjs 3050         # copy staged 3050 over the repo's .fs files
git add -A && git commit -m "Standard library 3050"
```

Version numbers in imports are stripped to the `✨` placeholder so version-to-version diffs show only
real code changes.

## Security

- **No credentials in this code.** Auth happens by you logging in by hand in the browser window each
  run. The scripts never contain, prompt for, or type a password, key, or token.
- The resulting session cookies are saved to `.auth/onshape-state.json`, which is **gitignored and
  must never be committed**. Delete that file to force a fresh login.
- The only hardcoded id is the **public** Onshape standard-library document. No personal user,
  account, or document ids are embedded.
- `.auth/`, `staged/`, and `node_modules/` are all gitignored.
