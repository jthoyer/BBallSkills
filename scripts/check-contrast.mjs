#!/usr/bin/env node
/**
 * check-contrast.mjs: measures every text/background pairing the site uses
 * (AC20), reading the colours from site/css/tokens.css. Dev-only, plain Node.
 *   node scripts/check-contrast.mjs          prints a Markdown table, exits 1 on a fail
 * Thresholds: 4.5 body text, 3 large text, control borders, focus ring, graphics.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'site/css/tokens.css'), 'utf8');
const tok = {};
for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) tok[m[1]] = m[2].toUpperCase();

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground token, background token, need, where it is used]
const PAIRS = [
  ['text', 'bg', 4.5, 'Body text, page titles on the page'],
  ['text', 'surface', 4.5, 'Row titles, cues, cards, filter buttons, level word'],
  ['muted', 'bg', 4.5, 'Lead text, credit line, "Graded by us"'],
  ['muted', 'surface', 4.5, 'Row meta, row numbers (large), inactive tabs'],
  ['accent', 'bg', 4.5, 'Section labels, links, back link, wordmark, focus ring text'],
  ['accent', 'surface', 4.5, 'Chevrons, labels inside cards, active tab'],
  ['on-accent', 'accent', 4.5, 'Suggest button, selected filter, Do it block, cue numbers, skip link'],
  ['border', 'bg', 3, 'Control border on page background; unfilled level bars'],
  ['border', 'surface', 3, 'Filter button border; note stripe'],
  ['accent', 'bg', 3, 'Level badge outline, filled level bars (graphics)'],
  ['accent', 'surface', 3, 'Row stripe, focus ring on a row (graphics)'],
  ['focus', 'bg', 3, 'Focus ring on the page background'],
  ['focus', 'surface', 3, 'Focus ring on rows, cards and the tab bar'],
  ['text', 'bg', 4.5, 'Play video label (on its own dark pill)'],
  ['on-accent', 'accent', 3, 'Play triangle on the orange play circle (graphic)'],
  ['accent', 'thumb', 3, 'Orange play circle against the placeholder thumbnail (graphic)'],
  ['focus', 'thumb', 3, 'Inset focus ring on the thumbnail surface when no image has loaded (graphic)'],
  ['muted', 'bg', 4.5, '"Thumbnail unavailable" label (on its own dark pill)'],
  ['bg', 'accent', 3, 'Play circle ring: dark ring against the orange circle (graphic)'],
];

let bad = 0;
const lines = ['| Foreground | Background | Ratio | Needs | Result | Used for |', '|---|---|---|---|---|---|'];
for (const [f, b, need, use] of PAIRS) {
  if (!tok[f] || !tok[b]) { console.error(`missing token ${f} or ${b}`); process.exit(2); }
  const r = ratio(tok[f], tok[b]);
  const pass = r >= need;
  if (!pass) bad++;
  lines.push(`| ${f} ${tok[f]} | ${b} ${tok[b]} | ${r.toFixed(2)} | ${need} | ${pass ? 'pass' : 'FAIL'} | ${use} |`);
}
console.log(lines.join('\n'));
console.log(`\n${PAIRS.length} pairings, ${bad} failed`);
process.exit(bad ? 1 : 0);
