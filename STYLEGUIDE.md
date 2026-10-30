# BBallSkills style guide

Style: **light, card-based**. A warm off-white page, white bordered cards, bright orange fills, dark-orange text and links, and a clean system sans. Phone first. All tokens live in `site/css/tokens.css`, the only stylesheet allowed to hold a colour literal (`scripts/check-content.mjs` fails on one anywhere else in `site/css/`). There are no web fonts.

## Colour tokens

| Token | Value | Role |
|---|---|---|
| `--color-bg` | #F7F5F2 | Page background |
| `--color-surface` | #FFFFFF | Cards, tab bar, footer, selects |
| `--color-thumb` | #D9D5CE | Thumbnail placeholder (decorative) |
| `--color-text` | #16181D | Body, titles, ink borders, ink-filled button |
| `--color-muted` | #545A66 | Secondary text, labels |
| `--color-accent` | #FF6A13 | **Fills and the heading rule only**: icon circles, badges, cue numbers, Do it, active select |
| `--color-on-accent` | #16181D | Text and icons on any orange fill (never white) |
| `--color-accent-tint` | #FFD2B8 | 30% of the accent over white: fill of an active filter select only |
| `--color-accent-text` | #B93C0A | Links, labels, active tab, chevrons, Clear all |
| `--color-border` | #7A756D | Control (select) borders, 3:1 or better |
| `--color-card-border` | #DDD8D0 | Decorative card outline |
| `--color-edge` | #D8D3CA | Decorative 4px left edge of cards |
| `--color-pill` | rgba(22, 24, 29, 0.82) | Dark pill over photos |
| `--color-white` | #FFFFFF | Text on the pill and on the ink-filled button only |
| `--color-focus` | #B93C0A | Focus ring (a literal equal to `--color-accent-text`, because the contrast script cannot resolve `var()`) |

**Rules:** orange is never text (about 2.6:1 on the page). Text and icons on orange are `--color-on-accent`. White on orange (2.87:1) is never used. Radii: 12px (`--radius`) for cards, buttons, selects, video and facts; 999px (`--radius-pill`) for pills and the skip link.

## Measured contrast

Produced by `node scripts/check-contrast.mjs`, which reads `tokens.css`, composites the translucent pill over white (the worst case) and over the thumbnail colour, and applies the WCAG 2.1 relative-luminance formula. Floors: 4.5 for text, 3 for non-text (control borders, the focus ring, graphics). Re-run it after any colour change and paste its output here unchanged.

| Foreground | Background | Ratio | Needs | Result | Used for |
|---|---|---|---|---|---|
| text #16181D | bg #F7F5F2 | 16.32 | 4.5 | pass | Body text, page titles, result line values |
| text #16181D | surface #FFFFFF | 17.76 | 4.5 | pass | Card titles, cues, facts, select text, footer safety line, outline buttons |
| muted #545A66 | bg #F7F5F2 | 6.37 | 4.5 | pass | Lead text, result line, select labels, credit line |
| muted #545A66 | surface #FFFFFF | 6.93 | 4.5 | pass | Card meta, inactive tab, footer text, facts labels |
| muted #545A66 | thumb #D9D5CE | 4.74 | 4.5 | pass | "No preview" and "Thumbnail unavailable" labels on the placeholder |
| accent-text #B93C0A | bg #F7F5F2 | 5.20 | 4.5 | pass | Links, back link, labels, wordmark, Clear all |
| accent-text #B93C0A | surface #FFFFFF | 5.65 | 4.5 | pass | Chevrons, active tab, labels inside cards |
| on-accent #16181D | accent #FF6A13 | 6.19 | 4.5 | pass | Do it block, active select, icon circles, badges, cue numbers, skip link |
| white #FFFFFF | pill over white #404246 | 10.07 | 4.5 | pass | Pill and "Play video" label over a white photo (worst case) |
| white #FFFFFF | pill over thumb #393A3D | 11.37 | 4.5 | pass | Pill and "Play video" label over the placeholder |
| text #16181D | accent-tint #FFD2B8 | 12.82 | 4.5 | pass | Value text of an active filter select |
| white #FFFFFF | text #16181D | 17.76 | 4.5 | pass | Show all drills (ink-filled button) |
| border #7A756D | bg #F7F5F2 | 4.20 | 3 | pass | Select border on the page; unfilled level bars |
| border #7A756D | surface #FFFFFF | 4.57 | 3 | pass | Select border on a card or the footer |
| text #16181D | bg #F7F5F2 | 16.32 | 3 | pass | Active select ink border; Suggest button border |
| text #16181D | surface #FFFFFF | 17.76 | 3 | pass | Outline button border on the footer; level bars on a card |
| focus #B93C0A | bg #F7F5F2 | 5.20 | 3 | pass | Focus ring on the page |
| focus #B93C0A | surface #FFFFFF | 5.65 | 3 | pass | Focus ring on cards, the footer and the tab bar |
| focus #B93C0A | thumb #D9D5CE | 3.87 | 3 | pass | Inset focus ring on the thumbnail when no image has loaded |
| on-accent #16181D | accent #FF6A13 | 6.19 | 3 | pass | Play triangle and skill icons on orange (graphics) |
| text #16181D | accent-tint #FFD2B8 | 12.82 | 3 | pass | Active select ink border against its tint fill |
| focus #B93C0A | accent-tint #FFD2B8 | 4.08 | 3 | pass | Focus ring if it ever touches the tint (it sits outside, on the page) |
| text #16181D | accent #FF6A13 | 6.19 | 3 | pass | Play-circle ring against the orange circle (graphic) |

Exempt (not measured):

| Foreground | Background | Why exempt |
|---|---|---|
| accent #FF6A13 | bg / surface | Fill and heading rule only: never text and never a required graphic (about 2.6 to 2.9:1) |
| card-border #DDD8D0 | bg / surface | Decorative card outline; the card content carries the meaning |
| edge #D8D3CA | surface | Decorative 4px left edge; carries no information |
| white #FFFFFF | accent | Never used: text on orange is always on-accent |

Lowest ratio: 3.87 (focus on thumb)

23 pairings, 0 failed

A second pass over the rendered pages (every visible text node against its composited background, at 390px, on Find idle, Find with filters, the empty state, a drill page with the Suggest note open, Positions, a position, the zone page and Not found) found a text floor of 5.20:1 (dark-orange wordmark and links on the page). The lowest figure anywhere is 3.87:1 (the inset focus ring on the empty thumbnail), then 4.20:1 (select border on the page). The pill over a real photo cannot be measured here: the worst case (a white photo) is 10.07:1.

## Type

No web fonts. Stack: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Nothing is downloaded for type.

| Role | Style |
|---|---|
| Page title (h1) | 26px / 800, centred, 4px orange rule (32px from 48em) |
| Section heading (h2 with rule) | 20px / 800, centred, 3px orange rule |
| Card title | 18px / 700 (16px compact) |
| Body | 17px / 500 |
| Meta, labels, pill | 14px / 600 (the minimum size); select text is also 14px / 600 |
| Label (family, in-card, drill block) | 14px / 700 caps, +0.06em, dark orange, no rule |
| Do it text | 20px / 700 |
| Button | 16px / 700 |

## Shape and space

An orange rule under every h1 and every list-section h2; in-card and drill-page labels carry none (one rule per level). Cards are white with a 1px `--color-card-border` outline; schedule, facts, cue, why and empty cards add a 4px `--color-edge` left edge. Tap targets: buttons and selects 48px, Clear all 44px, tab bar 58px, cards at least 76px (compact). Content column maximum 44rem. One breakpoint override at 48em (wider padding, two-column drill cards, larger h1) and one at 22.5em (360px: the three selects share one row).

## Components

- **Drill card, full** (`ui.js drillCard()`): one link. A 16:9 lazy thumbnail from `i.ytimg.com` (empty alt), a dark pill bottom-left with level bars, the level word and the length (no dangling separator when there is none), then a 44px orange circle with a dark skill icon, the 18px title and "Skill . needs". No resource, or a thumbnail that fails to load, shows a "No preview" placeholder and the card still links.
- **Drill card, compact** (`drillCard(key, {compact: true})`): 104px thumbnail on the left, title, and "bars Level . length". Used on position pages, zone cards and "More ... drills".
- **Schedule card** (`ui.js scheduleCard()`): one link with a top meta row (bold left, muted right), a 40px orange badge (number or icon), the 20px name, a bold count and a chevron. Used on Positions, "All six skills" (single row, no meta) and the Zone card. On the zone page the same look holds drill links, so those cards are not links themselves and never nest one.
- **Filter selects** (`.finder`): three native `<select>`s, Skill, Level, Needs, 48px high, in **one row from 360px up** (Skill on its own row below 360px). There are no visible labels: each select has a visually-hidden `<label for>` for its name, and its first option says what it is ("All skills", "Any level", "Any kit"). Options are derived from `content.js` (Level lists only levels some drill has; Needs only the setups some drill has); the Needs labels are kept short ("Just me", "Partner", "A hoop") so no chosen value is ever cut off. The columns are sized to their longest option. No count appears in any option. A non-default select gets a light orange tint fill (`--color-accent-tint`), an ink border and bold text, and its value is its visible text. Changing one repaints only the result line, Clear all and list; it never repaints the selects, touches the hash or moves focus. Height budget, h1 rule to first card: 122px measured at 360, 390 and 430 (limits 150 / 140 / 140), idle and with one or three filters set.
- **Result line**: "Showing N drills" is the only place the count appears on Find. While a filter is active, **Clear all** (44px, dark orange) sits on the right of the same line; there is no summary row. Neither carries `role="status"` or `aria-live`; the single live region is `#status`, which announces the count and active values once per change.
- **Empty state**: when the filters match nothing, a card headed "No drills match", a reason derived from the content ("Take off Just me to see 1 drill.") and a "Show all drills" ink-filled button. It behaves like Clear all and moves focus to the Skill select. Combinations are never disabled.
- **Facts card**: level bars and word, length when known, "You need", and "Level graded by us, not by the video makers."
- **Video** (`videoBlock()`): thumbnail plus a play button. Nothing else loads before a tap. A tap swaps in one `youtube-nocookie.com` iframe with a unique title and moves focus to it. A failed thumbnail becomes a labelled "Thumbnail unavailable" placeholder and play still works. Only `status: 'removed'`, an empty ID or one that is not 11 characters of `[A-Za-z0-9_-]` shows "Video no longer available".
- **Level** (`levelBars()`, `levelLabel()`): three bars plus the word. Level is never colour alone.
- **Do it block**: full-width orange block, near-black text. Holds no focusable control.
- **Footer** (`index.html`, outside `#view`): the one `contentinfo` landmark on every route, after the main content and before the tab bar. Bold "No accounts, forms or tracking.", the YouTube line, and the Suggest a drill control. Views never render the control themselves.
- **Suggest a drill** (`suggestControl()`): an outline button that reveals how-to text while `config.suggestFormUrl` is empty; an external link (`rel="noopener"`) once it is an https URL. Never an `<a>` with an empty or `#` href.
- **Tab bar**: two equal tabs, Drills and Positions, 58px high, aria-hidden icons above the label. The active tab is dark orange, 800 weight, with a 3px top bar. A drill page marks the tab of the route it was opened from (Drills by default), and Back returns there. Not found marks none.

## Accessibility rules

- Skip link first. On navigation, focus moves to `#page-title` (no scroll) and `document.title` updates.
- Focus ring: 3px dark orange (`--color-focus`), 2px offset, never removed. It is drawn outside the control, so on an orange-filled control it sits on the page or card, never on the orange (focus on orange measures 1.97:1 and is not used). Tab and video-play focus is drawn inset. `html` has `scroll-padding-bottom` so a focused element is never hidden under the fixed tab bar.
- Every control is at least 44 by 44px. Links inside a sentence (the channel credit) are exempt (WCAG 2.5.8 inline exception).
- Icons are decorative (`aria-hidden`). The tab icons always sit beside a text label.
- No text is ever cut off: no ellipsis, no line clamp, no clipped overflow, at 320, 390, 768 and 1280. `check-site.cjs` measures every select option against the select's own width.
- No `<form>`, `<input>`, `<textarea>`, storage, cookies or analytics anywhere in `site/`. The only form controls are the three filter `<select>`s on the Find view; they sit in no `<form>` and nothing is stored. Filter state lives in memory and a reload resets it.
- Heading levels never skip: h1, then h2, then h3.
