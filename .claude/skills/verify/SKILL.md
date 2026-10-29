---
name: verify
description: How to serve and check the BBallSkills site locally (static, no build step) before a push. Use when verifying any change to site/ or scripts/.
---

# Verify BBallSkills

The site is static. It is served from `site/` under the `/BBallSkills/` subpath, as on GitHub Pages.

## Serve

```bash
D=$(mktemp -d); mkdir -p "$D/srv"; ln -sfn "$PWD/site" "$D/srv/BBallSkills"
cd "$D/srv" && python3 -m http.server 8765
```

Open http://localhost:8765/BBallSkills/. Deep links work, e.g. `#/drills/form-shooting`.

## Check

From the repo root:

```bash
node scripts/check-content.mjs
node scripts/check-contrast.mjs
node scripts/check-site.cjs
```

Each prints `N checks, 0 failed` when green. `check-site.cjs` drives Chromium through Playwright, so it needs Playwright available to `require('playwright')`.

## Traps

- A hash-only `page.goto` does not reload the page. Use a fresh page for `page.route` stubs and for any first-Tab test.
- YouTube thumbnails (`i.ytimg.com`) may be blocked where you run the checks. The site shows a "Thumbnail unavailable" placeholder, and the checks expect that.
- To test `suggestFormUrl`, a removed video, an empty `youtubeId` or a video length, rewrite `content.js` through `page.route`. Don't edit the file.
- After setting `watched: true` on a video, run `node scripts/gen-watchlist.mjs`, or check-content fails on the WATCHLIST count.
