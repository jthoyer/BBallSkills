#!/usr/bin/env node
/**
 * check-site.cjs: browser checks for the live site (dev-only; Playwright is
 * expected to be installed globally, nothing is added to the repo).
 *
 *   python3 -m http.server 8765   (from a directory where site/ is mounted as BBallSkills/)
 *   BASE=http://localhost:8765/BBallSkills/ node scripts/check-site.cjs
 *
 * Every scenario runs in a NEW browser context (fresh storage, fresh module
 * state, full document load). Exits 1 on any failure.
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:8765/BBallSkills/';
const ORIGIN = new URL(BASE).origin;
const HOST = new URL(BASE).host;

const GROUPS = ['ball-handling', 'shooting', 'passing', 'footwork', 'defence', 'rebounding'];
const POS = ['point-guard', 'shooting-guard', 'small-forward', 'power-forward', 'centre'];
let DRILLS = [];

let checks = 0, fails = 0;
const failures = [];
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; failures.push(msg); console.error('FAIL: ' + msg); }
}

async function fresh(browser, { width = 390, height = 800, route } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const requests = [];
  const failed = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return { context, page, requests, failed, errors };
}

async function open(page, hash) {
  await page.goto(BASE + hash, { waitUntil: 'load' });
  await page.waitForSelector('#page-title');
}

(async () => {
  const browser = await chromium.launch();

  // Drill slugs come from the page itself, not from a hard-coded list.
  {
    const s = await fresh(browser);
    await open(s.page, '#/');
    const mod = await s.page.evaluate(async () => {
      const c = await import('./js/content.js');
      return { drills: Object.keys(c.drills), skills: c.skills.map((x) => x.slug), positions: c.positions.map((p) => p.slug) };
    });
    DRILLS = mod.drills;
    ok(DRILLS.length === 18, 'harness sees 18 drills');
    ok(JSON.stringify(mod.skills) === JSON.stringify(GROUPS), 'harness sees six groups');
    await s.context.close();
  }

  const ROUTES = ['#/', ...GROUPS.map((g) => `#/skills/${g}`), ...DRILLS.map((d) => `#/drills/${d}`),
    '#/positions', ...POS.map((p) => `#/positions/${p}`), '#/positions/zone', '#/about', '#/nope',
    '#/week', '#/drills/nope', '#/skills/nope', '#/positions/nope'];

  // ---- Per-route checks at 390 and 320 (fresh context per route and width)
  for (const width of [390, 320]) {
    for (const hash of ROUTES) {
      const s = await fresh(browser, { width });
      const { page } = s;
      await open(page, hash);
      const info = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        bodySw: document.body.scrollWidth,
        h1: document.querySelectorAll('h1').length,
        iframes: document.querySelectorAll('iframe').length,
        title: document.title,
        current: [...document.querySelectorAll('[data-tab][aria-current="page"]')].map((a) => a.dataset.tab),
        tabs: [...document.querySelectorAll('[data-tab]')].map((a) => a.textContent.trim()),
        urls: [...document.querySelectorAll('[href],[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src')),
        emptyLinks: [...document.querySelectorAll('a')].filter((a) => { const h = a.getAttribute('href'); return !h || h === '#'; }).length,
        forms: document.querySelectorAll('form,input,textarea,select').length,
        ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie,
      }));
      const tag = `${hash} @${width}`;
      ok(info.sw <= info.cw && info.bodySw <= info.cw, `AC18 ${tag}: no horizontal overflow (${info.sw}/${info.bodySw} vs ${info.cw})`);
      ok(info.h1 === 1, `${tag}: exactly one h1 (${info.h1})`);
      ok(info.iframes === 0, `AC12 ${tag}: no iframe before play`);
      ok(JSON.stringify(info.tabs) === JSON.stringify(['Skills', 'Positions', 'About']), `AC1 ${tag}: tabs are Skills, Positions, About`);
      ok(info.title.endsWith('BBallSkills') && info.title.length > 'BBallSkills'.length + 3, `${tag}: document.title updated ("${info.title}")`);
      ok(info.urls.every((u) => !u.startsWith('/')), `AC19 ${tag}: no leading-slash href/src`);
      ok(info.emptyLinks === 0, `AC10 ${tag}: no <a> with empty or # href`);
      ok(info.forms === 0 && info.ls === 0 && info.ss === 0 && info.cookie === '', `AC23 ${tag}: no form controls, storage or cookies`);
      const hosts = [...new Set(s.requests.map((u) => new URL(u).host).filter((h) => h))];
      const bad = hosts.filter((h) => h !== HOST && h !== 'i.ytimg.com');
      ok(bad.length === 0, `AC12 ${tag}: only localhost and i.ytimg.com before play (extra: ${bad.join(',')})`);
      const sameFail = s.failed.filter((u) => u.includes(HOST));
      ok(sameFail.length === 0, `AC19 ${tag}: 0 failed same-origin requests (${sameFail.join(',')})`);
      ok(s.errors.length === 0, `${tag}: no page errors (${s.errors.join(';')})`);
      if (hash === '#/') ok(JSON.stringify(info.current) === JSON.stringify(['skills']), `AC1: "#/" marks Skills aria-current`);
      if (hash === '#/nope' || hash === '#/week' || hash === '#/drills/nope' || hash === '#/skills/nope' || hash === '#/positions/nope') {
        const txt = await page.textContent('h1');
        ok(/not found/i.test(txt), `AC11 ${tag}: not-found view ("${txt}")`);
        ok(await page.evaluate(() => location.hash) === hash, `AC11 ${tag}: URL preserved`);
        ok(await page.locator('a[href="#/"]').count() >= 1, `AC11 ${tag}: link home`);
      }
      await s.context.close();
    }
  }

  // ---- AC21 / AC22: keyboard pass, focus ring, skip link, tap size (390 and 1280)
  for (const width of [390, 1280]) {
    for (const hash of ROUTES) {
      const s = await fresh(browser, { width });
      const { page } = s;
      await open(page, hash);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const n = await page.evaluate(() => {
        const sel = 'a[href],button,[tabindex]:not([tabindex="-1"]),iframe';
        return [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length).length;
      });
      const seen = [];
      for (let i = 0; i < n + 1; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return null;
          const cs = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          return { tag: e.tagName, text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30),
            ow: parseFloat(cs.outlineWidth), os: cs.outlineStyle, w: r.width, h: r.height,
            cls: e.className, skip: e.classList.contains('skip-link') };
        });
        if (f) seen.push(f);
      }
      const tag = `${hash} @${width}`;
      ok(seen.length > 0 && seen[0].skip, `AC21 ${tag}: skip link is first focus stop`);
      for (const f of seen) ok(f.os !== 'none' && f.ow >= 2, `AC21 ${tag}: focus outline visible on ${f.tag} "${f.text}" (${f.os} ${f.ow}px)`);
      // Tap size: every visible interactive element, except links inside a sentence (D4).
      const small = await page.evaluate(() => {
        const out = [];
        const sel = 'a[href],button,[role="button"]';
        for (const e of document.querySelectorAll(sel)) {
          if (!e.getClientRects().length) continue;
          const r = e.getBoundingClientRect();
          const inSentence = e.tagName === 'A' && e.closest('p') && e.closest('p').textContent.trim() !== e.textContent.trim() && !e.classList.contains('btn');
          if (inSentence) continue;
          if (r.width < 44 || r.height < 44) out.push(`${e.tagName} "${(e.textContent || '').trim().slice(0, 25)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return out;
      });
      ok(small.length === 0, `AC22 ${tag}: all controls >= 44x44 (${small.join('; ')})`);
      await s.context.close();
    }
  }

  // ---- Navigation moves focus to #page-title and updates document.title (click, not goto)
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    const before = await page.title();
    await page.click('a.tab[data-tab="positions"]');
    await page.waitForFunction(() => document.getElementById('page-title').textContent === 'Positions');
    ok(await page.evaluate(() => document.activeElement.id) === 'page-title', 'AC21: navigation moves focus to #page-title');
    ok((await page.title()) !== before && (await page.title()).startsWith('Positions'), 'AC21: document.title updates on navigation');
    await page.click('a[href="#/positions/zone"]');
    await page.waitForFunction(() => /zone/i.test(document.getElementById('page-title').textContent));
    ok(await page.evaluate(() => document.activeElement.id) === 'page-title', 'AC21: focus on #page-title after zone navigation');
    ok(await page.evaluate(() => document.querySelector('.tab[aria-current="page"]').dataset.tab) === 'positions', 'Zone keeps Positions tab current');
    await s.context.close();
  }

  // ---- Focus is never hidden under the fixed tab bar (short viewport, long pages)
  for (const hash of ['#/positions/zone', '#/positions/shooting-guard', '#/skills/shooting']) {
    const s = await fresh(browser, { width: 390, height: 500 });
    const { page } = s;
    await open(page, hash);
    const total = await page.evaluate(() => document.querySelectorAll('#view a[href], #view button').length);
    const bad = [];
    for (let i = 0; i < total + 6; i++) {
      await page.keyboard.press('Tab');
      const m = await page.evaluate(() => {
        const e = document.activeElement; const bar = document.querySelector('.tabbar');
        if (!e || e === document.body || !bar || bar.contains(e) || e.classList.contains('skip-link')) return null;
        return { bottom: e.getBoundingClientRect().bottom, top: bar.getBoundingClientRect().top, t: (e.textContent || '').trim().slice(0, 20) };
      });
      if (m && m.bottom > m.top + 0.5) bad.push(`${m.t} bottom ${Math.round(m.bottom)} > bar top ${Math.round(m.top)}`);
    }
    ok(bad.length === 0, `Focus ${hash} @390x500: every focused element sits above the tab bar (${bad.slice(0, 3).join('; ')})`);
    await s.context.close();
  }

  // ---- Placeholder label shows when the thumbnail fails; invalid ID treated like empty
  {
    const s = await fresh(browser);
    await s.page.route('**/i.ytimg.com/**', (r) => r.abort());
    await open(s.page, '#/drills/hundred-dribble');
    await s.page.waitForSelector('.video--nothumb');
    const lbl = await s.page.evaluate(() => getComputedStyle(document.querySelector('.video--nothumb'), '::before').content);
    ok(/Thumbnail unavailable/.test(lbl), `Placeholder label shown when the thumbnail fails (${lbl})`);
    await s.context.close();
  }

  // ---- AC4: level filter (fresh context per group)
  for (const g of GROUPS) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, `#/skills/${g}`);
    const all = await page.locator('#drill-list a.row').count();
    ok(all === 3, `AC3 ${g}: lists 3 drills (${all})`);
    const labels = await page.locator('.filter__btn').allTextContents();
    ok(JSON.stringify(labels) === JSON.stringify(['All', 'Beginner', 'Intermediate', 'Advanced']), `AC4 ${g}: filter options ${labels}`);
    const hash0 = await page.evaluate(() => location.hash);
    const live = await page.evaluate(() => { window.__log = []; new MutationObserver((m) => window.__log.push(document.getElementById('status').textContent)).observe(document.getElementById('status'), { childList: true, characterData: true, subtree: true }); return true; });
    for (const [lvl, expected] of [['Beginner', 2], ['Intermediate', 1], ['Advanced', 0], ['All', 3]]) {
      await page.focus(`.filter__btn[data-level="${lvl}"]`);
      await page.keyboard.press('Enter');
      const st = await page.evaluate(() => ({
        pressed: [...document.querySelectorAll('.filter__btn')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.level),
        focus: document.activeElement.dataset.level, hash: location.hash,
        rows: [...document.querySelectorAll('#drill-list a.row')].map((a) => a.textContent),
        empty: !!document.querySelector('#drill-list .empty'), ls: localStorage.length + sessionStorage.length,
      }));
      ok(JSON.stringify(st.pressed) === JSON.stringify([lvl]), `AC4 ${g}/${lvl}: aria-pressed only on ${lvl} (${st.pressed})`);
      ok(st.focus === lvl, `AC4 ${g}/${lvl}: focus stays on pressed control (${st.focus})`);
      ok(st.hash === hash0, `AC4 ${g}/${lvl}: hash unchanged`);
      ok(st.rows.length === expected, `AC4 ${g}/${lvl}: ${expected} drills shown (${st.rows.length})`);
      if (lvl !== 'All') ok(st.rows.every((t) => t.toLowerCase().includes(lvl.toLowerCase())), `AC4 ${g}/${lvl}: every shown drill is ${lvl}`);
      if (expected === 0) ok(st.empty && (await page.textContent('#drill-list')).trim().length > 10, `AC4 ${g}/${lvl}: text empty state`);
      ok(st.ls === 0, `AC4 ${g}/${lvl}: no storage written`);
    }
    const log = await page.evaluate(() => window.__log);
    ok(log.length === 4, `AC4 ${g}: 4 filter changes announced exactly 4 times (${log.length}: ${JSON.stringify(log)})`);
    await s.context.close();
  }

  // ---- AC13: play swaps in exactly one iframe; titles unique across drills
  const titles = new Set();
  for (const d of DRILLS) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, `#/drills/${d}`);
    const id = await page.getAttribute('.video__play', 'data-yt');
    await page.click('.video__play');
    const fr = await page.evaluate(() => ({ n: document.querySelectorAll('iframe').length, src: document.querySelector('iframe').src, title: document.querySelector('iframe').title,
      thumb: document.querySelectorAll('.video__thumb,.video__play').length, focus: document.activeElement.tagName }));
    ok(fr.n === 1, `AC13 ${d}: exactly one iframe after play (${fr.n})`);
    ok(new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${id}\\?.*rel=0`).test(fr.src), `AC13 ${d}: iframe src (${fr.src})`);
    ok(fr.title.trim().length > 0 && !titles.has(fr.title), `AC13 ${d}: iframe title non-empty and unique ("${fr.title}")`);
    titles.add(fr.title);
    ok(fr.thumb === 0, `AC13 ${d}: thumbnail and play button replaced`);
    ok(fr.focus === 'IFRAME', `AC13 ${d}: focus handed to the player`);
    await s.context.close();
  }

  // ---- AC14: thumbnail aborted -> placeholder, play works, not "no longer available"
  {
    const s = await fresh(browser);
    const { page } = s;
    await page.route('**/i.ytimg.com/**', (r) => r.abort());
    await open(page, '#/drills/hundred-dribble');
    await page.waitForSelector('.video--nothumb');
    const st = await page.evaluate(() => ({ gone: /no longer available/i.test(document.body.textContent), play: !!document.querySelector('.video__play'), img: !!document.querySelector('.video__thumb') }));
    ok(!st.gone && st.play && !st.img, 'AC14: thumbnail aborted -> placeholder with play button, not "no longer available"');
    await page.click('.video__play');
    ok(await page.locator('iframe').count() === 1, 'AC14: play still works after thumbnail failure');
    await s.context.close();
  }

  // ---- AC14 removed / empty id, and AC10 with a URL: serve a modified content.js
  async function withContent(transform, fn) {
    const s = await fresh(browser);
    await s.page.route('**/js/content.js', async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: transform(await res.text()) });
    });
    await fn(s);
    await s.context.close();
  }
  await withContent((t) => t.replace("status: 'ok'", "status: 'removed'"), async (s) => {
    await open(s.page, '#/drills/hundred-dribble');
    const st = await s.page.evaluate(() => ({ gone: /Video no longer available/.test(document.body.textContent), iframe: document.querySelectorAll('iframe').length, play: document.querySelectorAll('.video__play,.video__thumb').length }));
    ok(st.gone && st.iframe === 0 && st.play === 0, "AC14: status 'removed' -> message, no thumbnail, no iframe");
    ok(!s.requests.some((u) => u.includes('ytimg') && u.includes('v_jqSQswdbU')), "AC14: status 'removed' -> no thumbnail request");
  });
  await withContent((t) => t.replace("youtubeId: 'v_jqSQswdbU'", "youtubeId: ''"), async (s) => {
    await open(s.page, '#/drills/hundred-dribble');
    const st = await s.page.evaluate(() => ({ gone: /Video no longer available/.test(document.body.textContent), iframe: document.querySelectorAll('iframe').length, play: document.querySelectorAll('.video__play,.video__thumb').length }));
    ok(st.gone && st.iframe === 0 && st.play === 0, 'AC14: empty youtubeId -> message, no thumbnail, no iframe');
    ok(!s.requests.some((u) => u.includes('ytimg')), 'AC14: empty youtubeId -> no thumbnail request');
  });

  await withContent((t) => t.replace("youtubeId: 'v_jqSQswdbU'", "youtubeId: 'bad id!'"), async (s) => {
    await open(s.page, '#/drills/hundred-dribble');
    const st = await s.page.evaluate(() => ({ gone: /Video no longer available/.test(document.body.textContent), n: document.querySelectorAll('iframe,.video__play,.video__thumb').length }));
    ok(st.gone && st.n === 0, 'Invalid youtubeId format -> "Video no longer available", no iframe, no thumbnail');
    ok(!s.requests.some((u) => u.includes('ytimg')), 'Invalid youtubeId -> no thumbnail request');
  });

  // ---- AC10: suggest button
  for (const hash of ['#/', '#/about']) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, hash);
    ok(await page.locator('button[data-action="suggest"]').count() === 1, `AC10 ${hash}: Suggest a drill button present`);
    const vis0 = await page.locator('#suggest-note').isVisible();
    await page.focus('button[data-action="suggest"]');
    await page.keyboard.press('Enter');
    ok(!vis0 && await page.locator('#suggest-note').isVisible(), `AC10 ${hash}: activating reveals the explanation`);
    ok(await page.evaluate(() => document.activeElement.dataset.action) === 'suggest', `AC10 ${hash}: focus stays on the button`);
    ok(await page.getAttribute('button[data-action="suggest"]', 'aria-expanded') === 'true', `AC10 ${hash}: aria-expanded true`);
    await page.keyboard.press('Enter');
    ok(!(await page.locator('#suggest-note').isVisible()), `AC10 ${hash}: second press hides it again`);
    await s.context.close();
  }
  await withContent((t) => t.replace("suggestFormUrl: ''", "suggestFormUrl: 'https://forms.gle/example'"), async (s) => {
    for (const hash of ['#/', '#/about']) {
      await open(s.page, hash);
      const a = await s.page.evaluate(() => { const e = [...document.querySelectorAll('a')].find((x) => /Suggest a drill/.test(x.textContent)); return e && { href: e.getAttribute('href'), rel: e.getAttribute('rel') }; });
      ok(a && a.href === 'https://forms.gle/example' && a.rel === 'noopener', `AC10 ${hash}: with a URL it is an external link rel=noopener (${JSON.stringify(a)})`);
      ok(await s.page.locator('button[data-action="suggest"]').count() === 0, `AC10 ${hash}: no button when URL is set`);
    }
  });

  // ---- Content spot checks: AC5 order, AC6, AC8, AC9, AC24
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/drills/hundred-dribble');
    const order = await page.evaluate(() => {
      const main = document.getElementById('view');
      const idx = (sel) => { const e = main.querySelector(sel); if (!e) return -1; const all = [...main.querySelectorAll('*')]; return all.indexOf(e); };
      return [idx('.video'), idx('h1'), idx('.level'), idx('.graded'), idx('#why-h'), idx('#teaches-h'), idx('#cues-h'), idx('#doit-h'), idx('#needs-h'), idx('.credit a')];
    });
    ok(order.every((v, i) => v > -1 && (i === 0 || v > order[i - 1])), `AC5: drill sections in order (${order})`);
    const lvl = await page.textContent('.level');
    ok(/Beginner/.test(lvl) && /Graded by us/.test(await page.textContent('.level-line')), 'AC5/AC24: level word + Graded by us');
    const ch = await page.getAttribute('.credit a', 'href');
    ok(ch.startsWith('https://www.youtube.com/'), `AC5: channel linked to channel URL (${ch})`);
    await open(page, '#/positions');
    const fams = await page.evaluate(() => [...document.querySelectorAll('.group')].map((g) => g.querySelector('h2').textContent + ':' + [...g.querySelectorAll('.row__title')].map((r) => r.textContent).join(',')));
    ok(JSON.stringify(fams) === JSON.stringify(['Guards:Point guard,Shooting guard', 'Wings:Small forward', 'Bigs:Power forward,Centre', 'Team defence:Zone defence']), `AC6: positions grouped (${JSON.stringify(fams)})`);
    for (const p of POS) {
      await open(page, `#/positions/${p}`);
      const h = await page.textContent('h1');
      ok(/^Playing .+\? Start here$/.test(h), `AC6 ${p}: h1 "${h}"`);
      const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="#/skills/"]')].map((a) => a.getAttribute('href')));
      ok(GROUPS.every((g) => links.includes(`#/skills/${g}`)), `AC6 ${p}: links to all six skill groups`);
      ok(await page.locator('a[href^="#/drills/"]').count() >= 1, `AC6 ${p}: lists drills`);
    }
    await open(page, '#/positions/zone');
    const z = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, cards: [...document.querySelectorAll('.card')].map((c) => ({ t: c.querySelector('h3') ? c.querySelector('h3').textContent : '', d: c.querySelectorAll('a[href^="#/drills/"]').length })) }));
    ok(z.cards.length === 8 && z.cards.every((c) => c.d >= 1), `AC8: zone spots, core skills and rebounding each link a drill (${JSON.stringify(z.cards)})`);
    const ztext = await page.textContent('#view');
    ok(['Top guards', 'Wings', 'Middle', 'Stance and slides', 'Closeouts', 'Talking', 'Rotating', 'Rebounding'].every((w) => ztext.includes(w)), 'AC8: zone page names every part');
    await open(page, '#/about');
    const at = await page.textContent('#view');
    ok(/How to use/i.test(at) && /Where the videos come from/i.test(at) && /safe/i.test(at) && /Suggest a drill/.test(at), 'AC9: About sections present');
    await s.context.close();
  }

  // ---- Fallback font: block the self-hosted fonts and re-check overflow (Arial Narrow/Impact are wider)
  for (const width of [320, 390]) {
    for (const hash of ['#/', '#/skills/ball-handling', '#/drills/two-ball-passing', '#/drills/follow-the-leader-slides', '#/positions', '#/positions/shooting-guard', '#/positions/zone', '#/about', '#/nope']) {
      const s = await fresh(browser, { width });
      await s.page.route('**/fonts/**', (r) => r.abort());
      await open(s.page, hash);
      const o = await s.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(o[0] <= o[1], `AC18 fallback font ${hash} @${width}: no overflow (${o})`);
      await s.context.close();
    }
  }

  // ---- Other widths where components.css has an @media override (48em = 768px)
  for (const width of [768, 1280]) {
    for (const hash of ROUTES) {
      const s = await fresh(browser, { width });
      await open(s.page, hash);
      const o = await s.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(o[0] <= o[1], `AC18 ${hash} @${width}: no overflow (${o})`);
      await s.context.close();
    }
  }

  await browser.close();
  console.log(`${checks} checks, ${fails} failed`);
  if (fails) { console.log(failures.slice(0, 40).join('\n')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
