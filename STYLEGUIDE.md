# BBallSkills style guide

Style: **Arena**. Dark, bold, scoreboard-like: big condensed capitals, a hot-orange stripe, full-width tappable rows. Phone first. All tokens live in `site/css/tokens.css`; do not hard-code a colour anywhere else.

## Colour tokens

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | #0C0E14 | Page background ("the court") |
| `--color-surface` | #171A23 | Rows, cards, tab bar |
| `--color-thumb` | #2B303C | Video placeholder (decorative) |
| `--color-text` | #F2F4F8 | Body and titles |
| `--color-muted` | #A9B0BF | Secondary text |
| `--color-accent` | #FF6A13 | Stripes, links, labels, fills |
| `--color-on-accent` | #0C0E14 | Text on any orange fill |
| `--color-border` | #6F7889 | Control borders, unfilled level bars |
| `--color-focus` | #FF6A13 | Focus ring |

**Rule:** text on an orange fill is always `--color-on-accent` (near-black). White on this orange is about 2.9:1 and fails.

## Measured contrast (AC20)

Produced by `node scripts/check-contrast.mjs`, which reads `tokens.css` and applies the WCAG 2.1 relative-luminance formula. Re-run it after any colour change and paste the new table here. Thresholds: 4.5 for body text, 3 for large text, control borders, the focus ring and graphics.

| Foreground | Background | Ratio | Needs | Result | Used for |
|---|---|---|---|---|---|
| text #F2F4F8 | bg #0C0E14 | 17.52 | 4.5 | pass | Body text, page titles on the page |
| text #F2F4F8 | surface #171A23 | 15.78 | 4.5 | pass | Row titles, cues, cards, filter buttons, level word |
| muted #A9B0BF | bg #0C0E14 | 8.86 | 4.5 | pass | Lead text, credit line, "Graded by us" |
| muted #A9B0BF | surface #171A23 | 7.98 | 4.5 | pass | Row meta, row numbers (large), inactive tabs |
| accent #FF6A13 | bg #0C0E14 | 6.73 | 4.5 | pass | Section labels, links, back link, wordmark, focus ring text |
| accent #FF6A13 | surface #171A23 | 6.06 | 4.5 | pass | Chevrons, labels inside cards, active tab |
| on-accent #0C0E14 | accent #FF6A13 | 6.73 | 4.5 | pass | Suggest button, selected filter, Do it block, cue numbers, skip link |
| border #6F7889 | bg #0C0E14 | 4.34 | 3 | pass | Control border on page background; unfilled level bars |
| border #6F7889 | surface #171A23 | 3.91 | 3 | pass | Filter button border; note stripe |
| accent #FF6A13 | bg #0C0E14 | 6.73 | 3 | pass | Level badge outline, filled level bars (graphics) |
| accent #FF6A13 | surface #171A23 | 6.06 | 3 | pass | Row stripe, focus ring on a row (graphics) |
| focus #FF6A13 | bg #0C0E14 | 6.73 | 3 | pass | Focus ring on the page background |
| focus #FF6A13 | surface #171A23 | 6.06 | 3 | pass | Focus ring on rows, cards and the tab bar |
| text #F2F4F8 | bg #0C0E14 | 17.52 | 4.5 | pass | Play video label (on its own dark pill) |
| on-accent #0C0E14 | accent #FF6A13 | 6.73 | 3 | pass | Play triangle on the orange play circle (graphic) |
| bg #0C0E14 | accent #FF6A13 | 6.73 | 3 | pass | Play circle ring: dark ring against the orange circle (graphic) |

A second pass over the rendered pages (every visible text node against its composited background, 8 routes at 390px) found a minimum of 6.06:1 (orange chevron on a row surface). Non-text minimum is 3.91:1 (control border on a surface). The play circle sits on whatever thumbnail YouTube serves, so its contrast against the photo cannot be measured; the circle carries its own dark ring (6.73:1 against the orange).

## Type

| Role | Style |
|---|---|
| Page title | Barlow Condensed 800, caps, 34 to 44px (52px from 48em), line 0.95 |
| Row title | 30px / 800 condensed caps |
| Cue, card title | 28px / 800 condensed caps |
| Do it text | 32px / 800 condensed caps |
| Section label | 18px / 800 condensed caps, +0.12em, orange |
| Body | 17px / 500, system sans |
| Small, credit | 15px |
| Button | 22px / 800 condensed caps |

Barlow Condensed 700 and 800 (latin) are self-hosted in `site/fonts/` (SIL OFL 1.1, licence in `site/fonts/OFL.txt`), with `font-display: swap`. Fallback stack: Arial Narrow, Impact, sans-serif. No request is ever made to Google Fonts. Body text uses the system font stack.

## Shape and space

Radius: 12px buttons, rows (right side only) and cards; 6px chips and filter buttons; 10px cues. An 8px orange stripe on the left of every row. Tap targets: rows 72px (60px compact), buttons 54px, filter buttons 44px, tab bar 58px. Content column maximum 44rem. One breakpoint override at 48em (wider padding, two-column cards, larger title).

## Components

- **Row** (`ui.js row()`): number (optional), title, meta, chevron. Used for skill groups, positions, zone and drills.
- **Level badge** (`levelBadge()`): the word (Beginner, Intermediate, Advanced), three bars and an orange outline. The word is always present; level is never colour alone. Drill pages add "Graded by us" beside it.
- **Filter** (`.filter`): buttons with `aria-pressed`. The pressed one is orange-filled **and** carries a tick. Choosing a level repaints only the list and keeps focus on the pressed button. The result count goes to a polite live region (`#status`, outside `#view`).
- **Video** (`videoBlock()`): thumbnail from `i.ytimg.com` plus a play button. Nothing else loads before a tap. A tap swaps in one `youtube-nocookie.com` iframe with a unique title and moves focus to it. A failed thumbnail becomes a placeholder and play still works. Only `status: 'removed'` or an empty ID shows "Video no longer available".
- **Suggest a drill** (`suggestControl()`): a button that reveals how-to text while `config.suggestFormUrl` is empty; an external link (`rel="noopener"`) once it is an https URL. Never an `<a>` with an empty or `#` href.
- **Do it block**: full-width orange block, near-black text.

## Accessibility rules

- Skip link first. On navigation, focus moves to `#page-title` (no scroll) and `document.title` updates.
- Focus ring: 3px orange, 2px offset, never removed (6.73:1 on the page, 6.06:1 on surfaces). Tab and video-play focus is drawn inset.
- Every control is at least 44 by 44px. Links inside a sentence (the channel credit) are exempt (WCAG 2.5.8 inline exception).
- Icons are decorative (`aria-hidden`). The tab icons always sit beside a text label.
- No `<form>`, `<input>`, storage, cookies or analytics anywhere in `site/`.
