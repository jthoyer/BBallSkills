#!/usr/bin/env node
/**
 * check-contrast.mjs: measures every foreground/background pairing the site
 * uses, reading the colours from site/css/tokens.css. Dev-only, plain Node.
 *   node scripts/check-contrast.mjs          prints Markdown tables, exits 1 on a fail
 * Floors: 4.5 for text, 3 for non-text (control borders, focus ring, graphics).
 * Exits 2 if a token it needs is missing (never silently skips a pairing).
 *
 * Two derived backgrounds are composited here, not eyeballed:
 *  - "pill over white": the translucent dark pill (--color-pill) over a white
 *    photo, the WORST case for the white text on it;
 *  - "pill over thumb": the same pill over the thumbnail placeholder.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'site/css/tokens.css'), 'utf8');
const tok = {};
for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) tok[m[1]] = m[2].toUpperCase();

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

// The pill: rgba(r, g, b, a). Its colour and alpha both come from tokens.css.
const pillMatch = css.match(/--color-pill:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)\s*;/);
if (!pillMatch) { console.error('missing token pill (rgba)'); process.exit(2); }
const pillRgb = [pillMatch[1], pillMatch[2], pillMatch[3]].map(Number);
const pillAlpha = Number(pillMatch[4]);
const over = (base) => toHex(toRgb(base).map((v, i) => pillAlpha * pillRgb[i] + (1 - pillAlpha) * v));

const need = ['text', 'muted', 'bg', 'surface', 'thumb', 'accent', 'on-accent', 'accent-text', 'border', 'focus', 'white', 'card-border', 'edge'];
for (const n of need) if (!tok[n]) { console.error(`missing token ${n}`); process.exit(2); }
tok['pill over white'] = over(tok.white);
tok['pill over thumb'] = over(tok.thumb);

const lum = (hex) => {
  const c = toRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground token, background token, need, where it is used]
const PAIRS = [
  // Text, 4.5
  ['text', 'bg', 4.5, 'Body text, page titles, summary values'],
  ['text', 'surface', 4.5, 'Card titles, cues, facts, select text, footer safety line, outline buttons'],
  ['muted', 'bg', 4.5, 'Lead text, result line, select labels, credit line'],
  ['muted', 'surface', 4.5, 'Card meta, inactive tab, footer text, facts labels'],
  ['muted', 'thumb', 4.5, '"No preview" and "Thumbnail unavailable" labels on the placeholder'],
  ['accent-text', 'bg', 4.5, 'Links, back link, labels, wordmark, Clear all'],
  ['accent-text', 'surface', 4.5, 'Chevrons, active tab, labels inside cards'],
  ['on-accent', 'accent', 4.5, 'Do it block, active select, icon circles, badges, cue numbers, skip link'],
  ['white', 'pill over white', 4.5, 'Pill and "Play video" label over a white photo (worst case)'],
  ['white', 'pill over thumb', 4.5, 'Pill and "Play video" label over the placeholder'],
  ['white', 'text', 4.5, 'Show all drills (ink-filled button)'],
  // Non-text, 3
  ['border', 'bg', 3, 'Select border on the page; unfilled level bars'],
  ['border', 'surface', 3, 'Select border on a card or the footer'],
  ['text', 'bg', 3, 'Active select ink border; Suggest button border'],
  ['text', 'surface', 3, 'Outline button border on the footer; level bars on a card'],
  ['focus', 'bg', 3, 'Focus ring on the page'],
  ['focus', 'surface', 3, 'Focus ring on cards, the footer and the tab bar'],
  ['focus', 'thumb', 3, 'Inset focus ring on the thumbnail when no image has loaded'],
  ['on-accent', 'accent', 3, 'Play triangle and skill icons on orange (graphics)'],
  ['text', 'accent', 3, 'Play-circle ring against the orange circle (graphic)'],
];

// Pairs deliberately NOT measured, and why.
const EXEMPT = [
  ['accent', 'bg / surface', 'Fill and heading rule only: never text and never a required graphic (about 2.6 to 2.9:1)'],
  ['card-border', 'bg / surface', 'Decorative card outline; the card content carries the meaning'],
  ['edge', 'surface', 'Decorative 4px left edge; carries no information'],
  ['white', 'accent', 'Never used: text on orange is always on-accent'],
];

let bad = 0;
const lines = ['| Foreground | Background | Ratio | Needs | Result | Used for |', '|---|---|---|---|---|---|'];
let floor = { r: Infinity, label: '' };
for (const [f, b, need, use] of PAIRS) {
  const r = ratio(tok[f], tok[b]);
  const pass = r >= need;
  if (!pass) bad++;
  if (r < floor.r) floor = { r, label: `${f} on ${b}` };
  lines.push(`| ${f} ${tok[f]} | ${b} ${tok[b]} | ${r.toFixed(2)} | ${need} | ${pass ? 'pass' : 'FAIL'} | ${use} |`);
}
console.log(lines.join('\n'));
console.log('\nExempt (not measured):\n');
console.log('| Foreground | Background | Why exempt |\n|---|---|---|');
for (const [f, b, why] of EXEMPT) console.log(`| ${f} ${tok[f]} | ${b} | ${why} |`);
console.log(`\nLowest ratio: ${floor.r.toFixed(2)} (${floor.label})`);
console.log(`\n${PAIRS.length} pairings, ${bad} failed`);
process.exit(bad ? 1 : 0);
