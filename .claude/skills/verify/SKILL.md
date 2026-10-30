---
name: verify
description: How to serve and check the BBallSkills site locally (static, no build step) before a push. Use when verifying any change to site/ or scripts/.
---

# Verify BBallSkills

The site is static. It is served from `site/` under the `/BBallSkills/` subpath, as on GitHub Pages.

## Serve

```bash
D=$(mktemp -d); mkdir -p "$D/srv"; ln -sfn "$PWD/site" "$D/srv/BBallSkills"
(cd "$D/srv" && python3 -m http.server 8765 &)
```

Open http://localhost:8765/BBallSkills/. Deep links work, e.g. `#/drills/form-shooting`.

## Check

From the repo root:

```bash
node scripts/check-content.mjs
node scripts/check-contrast.mjs
node scripts/check-site.cjs
```

Each ends with `0 failed` when green (`N checks`, or `N pairings` for contrast). `check-site.cjs` drives Chromium through Playwright, so it needs Playwright available to `require('playwright')`.

## Traps

- A hash-only `page.goto` does not reload the page. Use a fresh page for `page.route` stubs and for any first-Tab test.
- YouTube thumbnails (`i.ytimg.com`) may be blocked where you run the checks. The site shows a "Thumbnail unavailable" placeholder, and the checks expect that.
- To test `suggestFormUrl`, a removed video, an empty `youtubeId` or a video length, rewrite `content.js` through `page.route`. Don't edit the file.
- After setting `watched: true` on a video, run `node scripts/gen-watchlist.mjs`, or check-content fails on the WATCHLIST count.
- Filters are native `<select>`s (`#f-skill`, `#f-level`, `#f-setup`). Drive them with `selectOption`, not `click`. `selectOption` does not move focus, so call `focus()` first when a test checks focus.
- A select's `scrollWidth` does not reveal clipped option text. To check fit, measure the option text on a canvas at the select's computed font and compare it with the select's inner width.
- This machine has Inter installed; phones do not. Test fallback fit by injecting `*{font-family: "Liberation Sans" !important}` (Arial metrics). DejaVu Sans is a pessimistic bound and clips "Intermediate" at 360px. Roboto is not installed here.
- After clicking a card, wait for the hash change and about 250ms before reading `.back`: the previous page's Back link is briefly still in the DOM.
- `check-site.cjs` takes over 100 seconds; run it in the background. Set `BASE=http://localhost:<port>/BBallSkills/` to use a port other than 8765.
