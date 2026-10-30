# BBallSkills

Basketball skill videos and drills for a community junior team: players aged 10 to 15, their parents and volunteer coaches. Phone first, video first, built for poor signal.

Site: https://jthoyer.github.io/BBallSkills/ (source in `site/`, deployed by `.github/workflows/pages.yml` on push to `main`).

Plain HTML, CSS and ES modules. No build step, no npm, no framework. It collects no data from anyone: no accounts, comments, forms, analytics or storage. The only form controls are the three filter selects on the Find view.

## Routes

Hash routing, so deep links work on GitHub Pages. All paths in `site/` are relative so the site works under `/BBallSkills/`.

| Route | Page |
|---|---|
| `#/` | Find a drill: all 18 drills, filter by skill, level, needs |
| `#/skills/:slug` | Find with that skill selected |
| `#/drills/:slug` | One drill: video, facts, Do it, cues, why, more from the skill |
| `#/positions` | Positions: Guards, Wings, Bigs, and Zone defence |
| `#/positions/:slug` | "Playing (position)? Start here", its drills, all six skills |
| `#/positions/zone` | The 2-3 zone (reserved word: it is matched before `:slug`) |
| anything else | Not found (the URL is kept) |

There is no About page. `#/about` shows Not found, like any unknown route. Filters live in memory only: a reload resets them, and nothing is written to the URL, storage or a cookie.

## Run it locally

Serve it from a folder where `site/` is mounted as `BBallSkills/`:

```
mkdir /tmp/serve && ln -s "$PWD/site" /tmp/serve/BBallSkills
cd /tmp/serve && python3 -m http.server 8765
# open http://localhost:8765/BBallSkills/
```

## Editing content

All content is in `site/js/content.js`. Nothing else holds drill text.

- `resources`: the videos (one per drill).
- `drills`: keyed by slug. Each has `title`, `resource`, `why`, `teaches`, `cues` (1 to 3), `doIt`, `level`, `group`, `positions`, `needs`, `setup`.
- `setup`: what the Needs filter matches. A non-empty list from `solo`, `partner`, `hoop`, shown as "Just me", "Partner or group" and "A hoop" (the labels are `SETUPS` in `content.js`). **"Just me" means alone, with no hoop.** A drill that needs a hoop is `hoop` only. A drill that needs a partner or group is `partner` and never `solo`. A drill with an optional partner ("Partner (optional)") is both `solo` and `partner`. The check script enforces these rules against `needs`.
- `skills`, `positions`, `zones['2-3']`: lists of drill **keys** only. Never paste drill text into them.
- `config.suggestFormUrl`: the Suggest a drill form. Leave `''` and the button explains how to suggest instead. Set an https URL and it becomes an external link.

`drill.group` must agree with `skills[].drills`, and `drill.positions` with `positions[].drills` and the drill keys used in `zones` (the value `'zone'`). The check script tells you if they drift.

## Adding a video

1. Find the video on YouTube and copy its 11-character ID from the URL (`watch?v=<id>`). Never type an ID from memory.
2. Add an entry to `resources` with `youtubeId`, `title`, `channel: { name, url }`, `length` (or `null`), `status: 'ok'`, `watched: false`, and `found: { searchTitle, url }` recording where you found it.
3. Add or edit the drill that uses it (`drills[...].resource`), and list its key in the right `skills`, `positions` and `zones` arrays.
4. Write the drill copy so it claims only what the video shows.
5. Run the checks (below), then `node scripts/gen-watchlist.mjs`.

If a video disappears, set its `status` to `'removed'`. The drill page then says "Video no longer available". A thumbnail that merely fails to load is not a removal.

## Watch before merge

Nobody builds this site by watching the footage, so every video starts as `watched: false` and is listed in [`WATCHLIST.md`](WATCHLIST.md) and the pull request body. **A person must watch every video, all the way through, and confirm it shows what its drill page says, before the pull request merges.** Then set `watched: true` on that resource and run `node scripts/gen-watchlist.mjs`. Do not merge while any row is left.

## Checks (dev only, not deployed)

```
node scripts/check-content.mjs     # content integrity: counts, IDs, cross-references, `setup`, WATCHLIST rows, forbidden strings, colour literals, no fonts
node scripts/check-contrast.mjs    # colour contrast from tokens.css (results are in STYLEGUIDE.md)
BASE=http://localhost:8765/BBallSkills/ node scripts/check-site.cjs   # browser checks; needs Playwright installed globally
```

The browser script opens every route in a fresh browser context and checks layout at four widths (320, 390, 768 and 1280): overflow, cut-off text and that every select option fits. It also checks network hosts, the iframe rules, focus, tap size, the three filter selects (including every two- and three-filter combination), where Back goes from a drill, the footer, the Suggest button and the removed-video states.

## Design

[`STYLEGUIDE.md`](STYLEGUIDE.md): the light tokens, type, components and the measured contrast table. There are no self-hosted fonts and no web fonts: the system font stack only, so nothing is downloaded for type.

## Claude Code agents and skills

Claude Code agents and skills live in [agent-skills-library](https://github.com/jthoyer/agent-skills-library). This repo keeps no copies: attach that library to a Claude Code session when the work needs its agents.
