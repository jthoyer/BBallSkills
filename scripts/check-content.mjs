#!/usr/bin/env node
/**
 * check-content.mjs: content integrity (drills, resources, cross-references, `setup`), plus
 * the text scans of site/ (forbidden strings, colour literals, fonts).
 * Dev-only; plain Node, no packages. Run: node scripts/check-content.mjs
 * Exits 1 on any failure.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const c = await import(pathToFileURL(join(root, 'site/js/content.js')).href);
const { drills, resources, skills, positions, zones, config, SETUPS } = c;

let fails = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.error('FAIL: ' + msg); }
}
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const GROUPS = ['ball-handling', 'shooting', 'passing', 'footwork', 'defence', 'rebounding'];
const POS = ['point-guard', 'shooting-guard', 'small-forward', 'power-forward', 'centre'];

// --- config
ok(typeof config.suggestFormUrl === 'string', 'config.suggestFormUrl is a string');

// --- AC15: drills
const keys = Object.keys(drills);
ok(keys.length === 18, `exactly 18 drills (got ${keys.length})`);
for (const g of GROUPS) {
  const inG = keys.filter((k) => drills[k].group === g);
  ok(inG.filter((k) => drills[k].level === 'Beginner').length === 2, `${g}: 2 Beginner`);
  ok(inG.filter((k) => drills[k].level === 'Intermediate').length === 1, `${g}: 1 Intermediate`);
  ok(inG.length === 3, `${g}: 3 drills in total`);
}
for (const k of keys) {
  const d = drills[k];
  for (const f of ['title', 'why', 'teaches', 'doIt', 'level']) ok(nonEmpty(d[f]), `${k}.${f} non-empty`);
  ok(['Beginner', 'Intermediate', 'Advanced'].includes(d.level), `${k}.level valid`);
  ok(GROUPS.includes(d.group), `${k}.group valid`);
  ok(Array.isArray(d.cues) && d.cues.length >= 1 && d.cues.length <= 3 && d.cues.every(nonEmpty), `${k}: 1 to 3 non-empty cues`);
  ok(Array.isArray(d.needs) && d.needs.every(nonEmpty), `${k}.needs is a string array`);
  ok(Array.isArray(d.positions) && d.positions.every((p) => POS.includes(p) || p === 'zone'), `${k}.positions values valid`);
  ok(Object.hasOwn(resources, d.resource), `${k}.resource "${d.resource}" exists`);

  // `setup` drives the Needs filter. It must agree with the free-text `needs`.
  const setupKeys = SETUPS.map((x) => x.key);
  ok(eq(setupKeys, ['solo', 'partner', 'hoop']), 'SETUPS are solo, partner, hoop, in that order');
  ok(Array.isArray(d.setup) && d.setup.length >= 1, `${k}.setup is a non-empty array`);
  const setup = Array.isArray(d.setup) ? d.setup : [];
  ok(new Set(setup).size === setup.length, `${k}.setup has no duplicates`);
  ok(setup.every((v) => setupKeys.includes(v)), `${k}.setup values are in the closed set`);
  const hasHoop = d.needs.some((n) => n.includes('Hoop'));
  ok(setup.includes('hoop') === hasHoop, `${k}: setup has "hoop" if and only if needs contains "Hoop"`);
  const needsPartner = d.needs.some((n) => (n.includes('Partner') && n !== 'Partner (optional)') || n.includes('Group'));
  if (needsPartner) {
    ok(setup.includes('partner') && !setup.includes('solo'), `${k}: needs a partner or group, so setup has partner and not solo`);
  }
  ok(!(setup.includes('solo') && setup.includes('hoop')), `${k}: setup never has solo and hoop together`);
  // The positive side: nothing in `needs` asks for a partner, group or hoop, so the drill is doable alone.
  if (!needsPartner && !hasHoop) ok(setup.includes('solo'), `${k}: needs no partner, group or hoop, so setup must include solo`);
}

// --- AC16: resources
const ids = new Set();
for (const [k, r] of Object.entries(resources)) {
  ok(r.kind === 'video', `${k}.kind is video`);
  ok(/^[A-Za-z0-9_-]{11}$/.test(r.youtubeId || ''), `${k}.youtubeId is 11 chars [A-Za-z0-9_-]`);
  ok(!ids.has(r.youtubeId), `${k}.youtubeId unique`);
  ids.add(r.youtubeId);
  ok(nonEmpty(r.channel && r.channel.name) && nonEmpty(r.channel && r.channel.url), `${k}.channel name and url`);
  ok(/^https:\/\//.test(r.channel && r.channel.url), `${k}.channel.url is https`);
  ok(typeof r.watched === 'boolean', `${k}.watched is a boolean (got ${JSON.stringify(r.watched)})`);
  ok(['ok', 'removed'].includes(r.status), `${k}.status valid`);
  ok(r.length === null || nonEmpty(r.length), `${k}.length is null or a string`);
  ok(nonEmpty(r.found && r.found.searchTitle), `${k}.found.searchTitle non-empty`);
  ok(nonEmpty(r.found && r.found.url) && r.found.url.includes(r.youtubeId), `${k}.found.url contains the youtubeId`);
  ok(/^https:\/\/(www\.|m\.)?youtube\.com\/watch\?/.test(r.found && r.found.url), `${k}.found.url is a youtube.com watch URL`);
  ok(keys.filter((d) => drills[d].resource === k).length === 1, `${k} is used by exactly one drill`);
}

// --- AC3 / AC7: skills <-> drill.group
ok(eq(skills.map((s) => s.slug), GROUPS), 'skills are the six groups in order');
for (const s of skills) {
  ok(s.drills.every((k) => Object.hasOwn(drills, k)), `skills.${s.slug}: every key resolves`);
  ok(s.drills.every((k) => typeof k === 'string'), `skills.${s.slug}: keys only`);
  const fromDrills = keys.filter((k) => drills[k].group === s.slug).sort();
  ok(eq([...s.drills].sort(), fromDrills), `skills.${s.slug} agrees with drills[].group`);
}

// --- AC7: positions <-> drill.positions
ok(eq(positions.map((p) => p.slug), POS), 'positions are the five slugs in order');
ok(!positions.some((p) => p.slug === 'zone'), 'no position uses the reserved slug "zone"');
const FAM = { 'point-guard': 'Guards', 'shooting-guard': 'Guards', 'small-forward': 'Wings', 'power-forward': 'Bigs', centre: 'Bigs' };
const NUM = { 'point-guard': 1, 'shooting-guard': 2, 'small-forward': 3, 'power-forward': 4, centre: 5 };
for (const p of positions) {
  ok(FAM[p.slug] === p.family && NUM[p.slug] === p.number, `positions.${p.slug}: family and number`);
  ok(p.drills.every((k) => typeof k === 'string' && Object.hasOwn(drills, k)), `positions.${p.slug}: every key resolves`);
  ok(p.drills.length === new Set(p.drills).size, `positions.${p.slug}: no duplicate keys`);
  const fromDrills = keys.filter((k) => drills[k].positions.includes(p.slug)).sort();
  ok(eq([...p.drills].sort(), fromDrills), `positions.${p.slug} agrees with drills[].positions`);
  ok(p.drills.length > 0, `positions.${p.slug} has drills`);
}

// --- AC8: zone <-> drill.positions
const z = zones['2-3'];
ok(!!z && nonEmpty(z.title) && nonEmpty(z.intro), 'zones[2-3] has title and intro');
ok(z.spots.length === 3 && z.spots.reduce((n, s) => n + s.count, 0) === 5, 'zone spots: top guards, wings, middle = 5 defenders');
ok(eq(z.spots.map((s) => s.count), [2, 2, 1]), 'zone spots counts are 2, 2, 1');
ok(z.spots.every((s) => nonEmpty(s.name) && nonEmpty(s.guards) && s.drills.length >= 1), 'each zone spot says what it guards');
ok(eq(z.coreSkills.map((s) => s.name), ['Stance and slides', 'Closeouts', 'Talking', 'Rotating']), 'zone core skills: stance/slides, closeouts, talking, rotating');
ok(z.coreSkills.every((s) => nonEmpty(s.text) && s.drills.length >= 1), 'each core skill has text and at least one drill');
ok(nonEmpty(z.rebounding.text) && z.rebounding.drills.length >= 1, 'zone rebounding has text and a drill');
const zoneKeys = new Set([...z.spots.flatMap((s) => s.drills), ...z.coreSkills.flatMap((s) => s.drills), ...z.rebounding.drills]);
ok([...zoneKeys].every((k) => Object.hasOwn(drills, k)), 'every zone key resolves to a drill');
ok(eq([...zoneKeys].sort(), keys.filter((k) => drills[k].positions.includes('zone')).sort()), 'zone drill keys agree with drills[].positions "zone"');

// --- AC7: no drill text duplicated outside `drills`
const outside = JSON.stringify({ skills, positions });
for (const k of keys) {
  for (const f of ['why', 'teaches', 'doIt']) ok(!outside.includes(drills[k][f]), `${k}.${f} is not copied into skills/positions`);
}
const zoneText = JSON.stringify(zones);
for (const k of keys) {
  for (const f of ['why', 'teaches']) ok(!zoneText.includes(drills[k][f]), `zones does not copy ${k}.${f}`);
}

// --- forbidden strings in site/ (the list only ever grows)
const FORBIDDEN = ['this week', 'thisweek', 'coach pick', 'localstorage', 'sessionstorage', 'document.cookie', '<form', '<input', '<textarea', 'googletagmanager', 'google-analytics', 'gtag(', 'fonts.googleapis', 'fonts.gstatic',
  'indexeddb', '@font-face', 'barlow', '#/about', 'text-overflow', 'line-clamp'];
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
for (const f of walk(join(root, 'site')).filter((p) => ['.html', '.js', '.css', '.txt', ''].includes(extname(p)))) {
  const text = readFileSync(f, 'utf8').toLowerCase();
  for (const bad of FORBIDDEN) ok(!text.includes(bad), `${f.replace(root + '/', '')} has no "${bad}"`);
}

// --- no self-hosted fonts, and no colour literal outside tokens.css
ok(!existsSync(join(root, 'site/fonts')), 'site/fonts does not exist (no self-hosted fonts)');
ok(!existsSync(join(root, 'site/js/views/about.js')), 'site/js/views/about.js does not exist (About is removed)');
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|%23[0-9a-f]{3,8}/i;
for (const f of walk(join(root, 'site/css')).filter((p) => extname(p) === '.css' && !p.endsWith('tokens.css'))) {
  const text = readFileSync(f, 'utf8');
  const hit = text.match(COLOUR_LITERAL);
  ok(!hit, `${f.replace(root + '/', '')} has no colour literal outside tokens.css${hit ? ` (found "${hit[0]}")` : ''}`);
}
const tokensCss = readFileSync(join(root, 'site/css/tokens.css'), 'utf8');
const indexHtml = readFileSync(join(root, 'site/index.html'), 'utf8');
const bgToken = (tokensCss.match(/--color-bg:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
ok(/<meta name="color-scheme" content="light">/.test(indexHtml), 'index.html color-scheme is light');
ok(!!bgToken && indexHtml.includes(`<meta name="theme-color" content="${bgToken}">`), `index.html theme-color equals --color-bg (${bgToken})`);

// --- AC25: no build step
for (const f of ['package.json', 'package-lock.json']) {
  let exists = true;
  try { statSync(join(root, f)); } catch { exists = false; }
  ok(!exists, `no ${f} in the repo root`);
}

// --- AC17: WATCHLIST.md has one row per resource with watched === false (zero rows once all are watched)
const watchlist = readFileSync(join(root, 'WATCHLIST.md'), 'utf8');
const unwatched = Object.entries(resources).filter(([, r]) => r.watched === false);
const rows = watchlist.split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l));
ok(rows.length === unwatched.length, `WATCHLIST.md has ${unwatched.length} rows (got ${rows.length})`);
for (const [k, r] of unwatched) {
  const row = rows.find((l) => l.includes(`https://www.youtube.com/watch?v=${r.youtubeId}`));
  ok(!!row, `WATCHLIST.md has a row for ${k} (${r.youtubeId})`);
  if (row) {
    ok(row.includes(r.found.searchTitle), `WATCHLIST.md row for ${k} has the recorded search title`);
    ok(row.includes(r.channel.name), `WATCHLIST.md row for ${k} has the channel`);
    ok(row.includes(drills[keys.find((d) => drills[d].resource === k)].title), `WATCHLIST.md row for ${k} has the drill title`);
  }
}

console.log(`${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
