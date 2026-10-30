#!/usr/bin/env node
/**
 * check-site.cjs: browser checks for the live site (dev-only; Playwright is
 * expected to be installed globally, nothing is added to the repo).
 *
 *   python3 -m http.server 8765   (from a directory where site/ is mounted as BBallSkills/)
 *   BASE=http://localhost:8765/BBallSkills/ node scripts/check-site.cjs
 *
 * Every scenario runs in a NEW browser context (fresh storage, fresh module
 * state, full document load) unless a comment says otherwise. Exits 1 on any
 * failure. WIDTHS are the four the layout is checked at: 320, 390, 768, 1280.
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:8765/BBallSkills/';
const ORIGIN = new URL(BASE).origin;
const HOST = new URL(BASE).host;

const GROUPS = ['ball-handling', 'shooting', 'passing', 'footwork', 'defence', 'rebounding'];
const POS = ['point-guard', 'shooting-guard', 'small-forward', 'power-forward', 'centre'];
const WIDTHS = [320, 390, 768, 1280];
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


// ---- Probes run inside the page -------------------------------------------------
const PROBE = {
  // AC13: text that is cut off, by overflow, ellipsis or line clamp.
  cutOff: () => {
    const clipped = [];
    for (const root of [document.getElementById('view'), document.querySelector('footer')]) {
      if (!root) continue;
      for (const e of root.querySelectorAll('*')) {
        if (e.closest('.visually-hidden')) continue; // screen-reader-only text is meant to be 1px
        const cs = getComputedStyle(e);
        const hides = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY);
        if (hides && e.scrollWidth > e.clientWidth) clipped.push(`${e.tagName}.${String(e.className).slice(0, 20)} ${e.scrollWidth}>${e.clientWidth}`);
      }
    }
    const ellipsis = [], clamp = [];
    for (const e of document.querySelectorAll('*')) {
      const cs = getComputedStyle(e);
      if (cs.textOverflow === 'ellipsis') ellipsis.push(e.tagName);
      if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') clamp.push(e.tagName);
    }
    return { clipped, ellipsis, clamp };
  },
  overflow: () => [document.documentElement.scrollWidth, document.documentElement.clientWidth, document.body.scrollWidth],
  // AC13 select fit: every option measured in the select's own computed font.
  selectFit: (limit) => {
    const bad = [];
    for (const sel of document.querySelectorAll('select')) {
      const cs = getComputedStyle(sel);
      const inner = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const probe = document.createElement('span');
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
      document.body.appendChild(probe);
      for (const o of sel.options) {
        probe.textContent = o.text;
        const w = probe.getBoundingClientRect().width;
        if (w > inner * limit) bad.push(`${sel.id} "${o.text}" ${w.toFixed(1)} > ${(inner * limit).toFixed(1)}`);
      }
      probe.remove();
    }
    return bad;
  },
  headings: () => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
  footer: () => {
    const feet = [...document.querySelectorAll('footer')];
    const f = feet[0];
    const main = document.getElementById('view');
    const nav = document.querySelector('nav.tabbar');
    const suggest = [...document.querySelectorAll('button[data-action="suggest"], a')].filter((e) => /^Suggest a drill/.test(e.textContent.trim()));
    return {
      n: feet.length,
      landmarks: document.querySelectorAll('footer, [role="contentinfo"]').length,
      safe: !!f && !!f.querySelector('p') && f.textContent.includes('No accounts, forms or tracking.'),
      safeBold: !!f && Number(getComputedStyle(f.querySelector('.site-foot__safe')).fontWeight) >= 700,
      yt: !!f && f.textContent.includes('Videos are public YouTube videos, credited on each drill. Thumbnails load from YouTube.'),
      suggest: suggest.length,
      suggestInFooter: suggest.every((e) => f && f.contains(e)),
      afterMain: !!f && !main.contains(f) && !!(main.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeNav: !!f && !!(f.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)
    };
  },
  tabs: () => {
    const tabs = [...document.querySelectorAll('[data-tab]')];
    return {
      labels: tabs.map((a) => a.textContent.trim()),
      widths: tabs.map((a) => a.getBoundingClientRect().width),
      heights: tabs.map((a) => a.getBoundingClientRect().height),
      iconsHidden: [...document.querySelectorAll('.tab__icon')].every((e) => e.getAttribute('aria-hidden') === 'true'),
      current: tabs.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => ({ tab: a.dataset.tab, weight: getComputedStyle(a).fontWeight, color: getComputedStyle(a).color, bar: getComputedStyle(a).borderTopColor, barW: getComputedStyle(a).borderTopWidth }))
    };
  },
  logStart: () => {
    window.__log = [];
    new MutationObserver(() => window.__log.push(document.getElementById('status').textContent))
      .observe(document.getElementById('status'), { childList: true, characterData: true, subtree: true });
  }
};

const NOT_FOUND = ['#/nope', '#/week', '#/drills/nope', '#/skills/nope', '#/positions/nope', '#/about'];
const expectedTab = (hash) => (NOT_FOUND.includes(hash) ? null : hash.startsWith('#/positions') ? 'positions' : 'drills');

async function setFilters(page, { skill, level, setup }) {
  if (skill !== undefined) await page.selectOption('#f-skill', skill);
  if (level !== undefined) await page.selectOption('#f-level', level);
  if (setup !== undefined) await page.selectOption('#f-setup', setup);
}
const cards = (page) => page.locator('#find-list a.dcard').count();

(async () => {
  const browser = await chromium.launch();

  // Drill data comes from the page itself, not from a hard-coded list.
  let CONTENT;
  {
    const s = await fresh(browser);
    await open(s.page, '#/');
    CONTENT = await s.page.evaluate(async () => {
      const c = await import('./js/content.js');
      return {
        drills: Object.keys(c.drills), skills: c.skills.map((x) => x.slug), skillNames: c.skills.map((x) => x.name), positions: c.positions.map((p) => p.slug),
        levels: c.LEVELS.filter((l) => Object.values(c.drills).some((d) => d.level === l)),
        setups: c.SETUPS.filter((x) => Object.values(c.drills).some((d) => d.setup.includes(x.key))),
        meta: Object.fromEntries(Object.entries(c.drills).map(([k, d]) => [k, { group: d.group, level: d.level, setup: d.setup, title: d.title, length: c.resources[d.resource].length, needs: d.needs }])),
        posDrills: Object.fromEntries(c.positions.map((p) => [p.slug, p.drills.length]))
      };
    });
    DRILLS = CONTENT.drills;
    ok(DRILLS.length === 18, 'harness sees 18 drills');
    ok(JSON.stringify(CONTENT.skills) === JSON.stringify(GROUPS), 'harness sees six groups');
    await s.context.close();
  }

  const ROUTES = ['#/', '#/skills', ...GROUPS.map((g) => `#/skills/${g}`), ...DRILLS.map((d) => `#/drills/${d}`),
    '#/positions', ...POS.map((p) => `#/positions/${p}`), '#/positions/zone', ...NOT_FOUND];
  const isFind = (h) => h === '#/' || h === '#/skills' || (h.startsWith('#/skills/') && GROUPS.includes(h.slice(9)));

  // ---- Per-route checks at 390 and 320 (fresh context per route and width)
  for (const width of [390, 320]) {
    for (const hash of ROUTES) {
      const s = await fresh(browser, { width });
      const { page } = s;
      await open(page, hash);
      const info = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        iframes: document.querySelectorAll('iframe').length,
        title: document.title,
        urls: [...document.querySelectorAll('[href],[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src')),
        emptyLinks: [...document.querySelectorAll('a')].filter((a) => { const h = a.getAttribute('href'); return !h || h === '#'; }).length,
        formish: document.querySelectorAll('form,input,textarea').length,
        selects: document.querySelectorAll('select').length,
        selectsInForm: [...document.querySelectorAll('select')].filter((e) => e.closest('form')).length,
        ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie,
      }));
      const tag = `${hash} @${width}`;
      ok(info.h1 === 1, `${tag}: exactly one h1 (${info.h1})`);
      ok(info.iframes === 0, `AC12 ${tag}: no iframe before play`);
      ok(info.title.endsWith('BBallSkills') && info.title.length > 'BBallSkills'.length + 3, `${tag}: document.title updated ("${info.title}")`);
      ok(info.urls.every((u) => !u.startsWith('/')), `AC19 ${tag}: no leading-slash href/src`);
      ok(info.emptyLinks === 0, `AC26 ${tag}: no <a> with empty or # href`);
      ok(info.formish === 0, `AC26 ${tag}: no form, input or textarea`);
      ok(info.selects === (isFind(hash) ? 3 : 0), `AC26 ${tag}: ${isFind(hash) ? 'exactly 3' : 'no'} select (${info.selects})`);
      ok(info.selectsInForm === 0, `AC26 ${tag}: no select inside a form`);
      ok(info.ls === 0 && info.ss === 0 && info.cookie === '', `AC26 ${tag}: no storage or cookies`);
      const hosts = [...new Set(s.requests.map((u) => new URL(u).host).filter((h) => h))];
      const bad = hosts.filter((h) => h !== HOST && h !== 'i.ytimg.com');
      ok(bad.length === 0, `AC26 ${tag}: only the site host and i.ytimg.com before play (extra: ${bad.join(',')})`);
      const fontReq = s.requests.filter((u) => /\/fonts\//.test(new URL(u).pathname) || /\.woff2?$/.test(new URL(u).pathname));
      ok(fontReq.length === 0, `AC5 ${tag}: no font requests (${fontReq.join(',')})`);
      const sameFail = s.failed.filter((u) => u.includes(HOST));
      ok(sameFail.length === 0, `AC19 ${tag}: 0 failed same-origin requests (${sameFail.join(',')})`);
      ok(s.errors.length === 0, `${tag}: no page errors (${s.errors.join(';')})`);
      const t = await page.evaluate(PROBE.tabs);
      ok(JSON.stringify(t.labels) === JSON.stringify(['Drills', 'Positions']), `AC24 ${tag}: tabs are Drills, Positions (${t.labels})`);
      const want = expectedTab(hash);
      ok(JSON.stringify(t.current.map((c) => c.tab)) === JSON.stringify(want ? [want] : []), `AC24 ${tag}: current tab is ${want} (${t.current.map((c) => c.tab)})`);
      if (width === 390) {
        ok(Math.abs(t.widths[0] - t.widths[1]) < 1, `AC24 ${tag}: two equal columns (${t.widths})`);
        ok(t.heights.every((h) => Math.round(h) === 58), `AC24 ${tag}: tabs 58px high (${t.heights})`);
        ok(t.iconsHidden, `AC24 ${tag}: tab icons are aria-hidden`);
        if (want) {
          const c = t.current[0];
          ok(c.color === 'rgb(185, 60, 10)' && Number(c.weight) === 800 && c.bar === 'rgb(185, 60, 10)' && c.barW === '3px', `AC24 ${tag}: active tab dark orange, 800, 3px top bar (${JSON.stringify(c)})`);
        }
      }
      const hs = await page.evaluate(PROBE.headings);
      ok(hs[0] === 1 && hs.every((v, i) => i === 0 || v <= hs[i - 1] + 1), `AC27 ${tag}: no skipped heading level (${hs})`);
      if (NOT_FOUND.includes(hash)) {
        const txt = await page.textContent('h1');
        ok(/not found/i.test(txt), `AC11 ${tag}: not-found view ("${txt}")`);
        ok(await page.evaluate(() => location.hash) === hash, `AC11 ${tag}: URL preserved`);
        ok(await page.locator('#view a[href="#/"]').count() >= 1, `AC11 ${tag}: link home`);
        ok(/Go to drills/.test(await page.textContent('#view')), `AC22 ${tag}: link reads "Go to drills"`);
      }
      await s.context.close();
    }
  }

  // ---- AC13 / AC14: overflow and cut-off text at all four widths, every route and filter state
  const STATES = [
    ['ball-handling/Beginner/solo', { skill: 'ball-handling', level: 'Beginner', setup: 'solo' }],
    ['shooting/Intermediate/solo (empty)', { skill: 'shooting', level: 'Intermediate', setup: 'solo' }],
  ];
  for (const width of WIDTHS) {
    const cases = [...ROUTES.map((h) => [h, null, h]), ...STATES.map(([n, f]) => ['#/', f, `#/ ${n}`])];
    for (const [hash, filt, label] of cases) {
      const s = await fresh(browser, { width });
      await open(s.page, hash);
      if (filt) await setFilters(s.page, filt);
      const tag = `${label} @${width}`;
      const o = await s.page.evaluate(PROBE.overflow);
      ok(o[0] <= o[1] && o[2] <= o[1], `AC14 ${tag}: no horizontal overflow (${o})`);
      const c = await s.page.evaluate(PROBE.cutOff);
      ok(c.clipped.length === 0, `AC13 ${tag}: no clipped text (${c.clipped.slice(0, 3).join('; ')})`);
      ok(c.ellipsis.length === 0 && c.clamp.length === 0, `AC13 ${tag}: no ellipsis or line clamp (${c.ellipsis.length}/${c.clamp.length})`);
      await s.context.close();
    }
    // Select fit, idle and with all three active (bold), at this width.
    for (const filt of [null, STATES[0][1]]) {
      const s = await fresh(browser, { width });
      await open(s.page, '#/');
      if (filt) await setFilters(s.page, filt);
      const bad = await s.page.evaluate(PROBE.selectFit, width === 320 ? 0.8 : 1);
      ok(bad.length === 0, `AC13 select fit @${width}${filt ? ' (all active)' : ''}: every option fits (${bad.join('; ')})`);
      await s.context.close();
    }
  }

  // ---- Keyboard pass, focus ring, skip link, tap size, footer (390 and 1280)
  for (const width of [390, 1280]) {
    for (const hash of ROUTES) {
      const s = await fresh(browser, { width });
      const { page } = s;
      await open(page, hash);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const n = await page.evaluate(() => {
        const sel = 'a[href],button,select,[tabindex]:not([tabindex="-1"]),iframe';
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
      ok(seen.length > 0 && seen[0].skip, `AC25 ${tag}: skip link is first focus stop`);
      for (const f of seen) ok(f.os !== 'none' && f.ow >= 2, `AC25 ${tag}: focus outline visible on ${f.tag} "${f.text}" (${f.os} ${f.ow}px)`);
      if (isFind(hash)) ok(seen.filter((f) => f.tag === 'SELECT').length === 3, `AC25 ${tag}: the three selects are keyboard stops`);
      // Tap size: every visible interactive element, except links inside a sentence.
      const small = await page.evaluate(() => {
        const out = [];
        for (const e of document.querySelectorAll('a[href],button,select,[role="button"]')) {
          if (!e.getClientRects().length) continue;
          const r = e.getBoundingClientRect();
          const inSentence = e.tagName === 'A' && e.closest('p') && e.closest('p').textContent.trim() !== e.textContent.trim() && !e.classList.contains('btn');
          if (inSentence) continue;
          if (r.width < 44 || r.height < 44) out.push(`${e.tagName} "${(e.textContent || '').trim().slice(0, 25)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return out;
      });
      ok(small.length === 0, `AC25 ${tag}: all controls >= 44x44 (${small.join('; ')})`);
      // AC23: footer
      const f = await page.evaluate(PROBE.footer);
      ok(f.n === 1 && f.landmarks === 1, `AC23 ${tag}: exactly one contentinfo landmark (${f.n}/${f.landmarks})`);
      ok(f.safe && f.safeBold && f.yt, `AC23 ${tag}: both footer lines present, safety line bold (${f.safe}/${f.safeBold}/${f.yt})`);
      ok(f.suggest === 1 && f.suggestInFooter, `AC23 ${tag}: exactly one Suggest a drill control, in the footer (${f.suggest})`);
      ok(f.afterMain && f.beforeNav, `AC23 ${tag}: footer after main and before the tab bar in DOM order`);
      await s.context.close();
    }
  }

  // ---- Navigation moves focus to #page-title and updates document.title (click, not goto)
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    const before = await page.title();
    ok(before.startsWith('Find a drill'), `AC25: Home title is "Find a drill" (${before})`);
    await page.click('a.tab[data-tab="positions"]');
    await page.waitForFunction(() => document.getElementById('page-title').textContent === 'Positions');
    ok(await page.evaluate(() => document.activeElement.id) === 'page-title', 'AC25: navigation moves focus to #page-title');
    ok((await page.title()) !== before && (await page.title()).startsWith('Positions'), 'AC25: document.title updates on navigation');
    await page.click('a[href="#/positions/zone"]');
    await page.waitForFunction(() => /zone/i.test(document.getElementById('page-title').textContent));
    ok(await page.evaluate(() => document.activeElement.id) === 'page-title', 'AC25: focus on #page-title after zone navigation');
    ok(await page.evaluate(() => document.querySelector('.tab[aria-current="page"]').dataset.tab) === 'positions', 'Zone keeps Positions tab current');
    await s.context.close();
  }

  // ---- Focus is never hidden under the fixed tab bar; footer clears it (short viewport, long pages)
  for (const hash of ['#/', '#/drills/form-shooting', '#/positions/zone', '#/positions/shooting-guard', '#/skills/shooting']) {
    const s = await fresh(browser, { width: 390, height: 500 });
    const { page } = s;
    await open(page, hash);
    const total = await page.evaluate(() => document.querySelectorAll('a[href], button, select').length);
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
    ok(bad.length === 0, `AC25 Focus ${hash} @390x500: every focused element sits above the tab bar (${bad.slice(0, 3).join('; ')})`);
    await s.context.close();
  }
  for (const hash of ['#/', '#/drills/form-shooting', '#/positions', '#/nope']) {
    const s = await fresh(browser, { width: 390, height: 500 });
    await open(s.page, hash);
    await s.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const m = await s.page.evaluate(() => ({ foot: document.querySelector('footer').getBoundingClientRect().bottom, bar: document.querySelector('.tabbar').getBoundingClientRect().top }));
    ok(m.foot <= m.bar + 0.5, `AC23 ${hash} @390x500: scrolled to the bottom, footer bottom ${Math.round(m.foot)} is above the tab bar top ${Math.round(m.bar)}`);
    await s.context.close();
  }

  // ---- AC7: thumbnails. Failed load -> placeholder, card still links. No resource -> no request.
  {
    const s = await fresh(browser);
    await s.page.route('**/i.ytimg.com/**', (r) => r.abort());
    await open(s.page, '#/drills/hundred-dribble');
    await s.page.waitForSelector('.video--nothumb');
    const lbl = await s.page.evaluate(() => getComputedStyle(document.querySelector('.video--nothumb'), '::before').content);
    ok(/Thumbnail unavailable/.test(lbl), `Placeholder label shown when the thumbnail fails (${lbl})`);
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    await s.page.route('**/i.ytimg.com/**', (r) => r.abort());
    await open(s.page, '#/');
    await s.page.waitForSelector('#find-list .thumb--none');
    const st = await s.page.evaluate(() => {
      const a = [...document.querySelectorAll('#find-list a.dcard')];
      const failed = a.filter((c) => c.querySelector('.thumb--none'));
      return { total: a.length, failed: failed.length, links: failed.every((c) => /^#\/drills\//.test(c.getAttribute('href'))), imgLeft: failed.some((c) => c.querySelector('img')), pills: failed.every((c) => c.querySelector('.pill')) };
    });
    ok(st.failed >= 1 && st.links && !st.imgLeft && st.pills, `AC7: aborted thumbnails -> placeholder, card still links with its pill (${JSON.stringify(st)})`);
    await s.context.close();
  }

  // ---- AC7: Home cards
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    ok(await cards(page) === 18, `AC7: #/ lists 18 cards (${await cards(page)})`);
    const bad = await page.evaluate((meta) => {
      const out = [];
      for (const a of document.querySelectorAll('#find-list a.dcard')) {
        const key = a.getAttribute('href').replace('#/drills/', '');
        const m = meta[key];
        const img = a.querySelector('img');
        const pill = a.querySelector('.pill');
        const ratio = a.querySelector('.thumb').getBoundingClientRect();
        if (!m) { out.push(`${key}: unknown`); continue; }
        if (!img || img.getAttribute('alt') !== '' || img.getAttribute('loading') !== 'lazy' || !/^https:\/\/i\.ytimg\.com\//.test(img.src)) out.push(`${key}: thumbnail`);
        if (Math.abs(ratio.width / ratio.height - 16 / 9) > 0.05) out.push(`${key}: not 16:9`);
        if (!pill || !pill.textContent.includes(m.level)) out.push(`${key}: pill level word`);
        if (pill && m.length && !pill.textContent.includes(m.length)) out.push(`${key}: pill length`);
        if (pill && /[·]\s*$/.test(pill.textContent.trim())) out.push(`${key}: dangling separator`);
        if (!a.querySelector('.ico svg')) out.push(`${key}: icon`);
        if (!a.querySelector('.dtitle') || a.querySelector('.dtitle').textContent !== m.title) out.push(`${key}: title`);
        const meta2 = a.querySelector('.dmeta').textContent;
        if (!meta2.includes(' · ') || !meta2.includes(m.needs.join(', '))) out.push(`${key}: meta "${meta2}"`);
      }
      return out;
    }, CONTENT.meta);
    ok(bad.length === 0, `AC7: every card has lazy 16:9 thumbnail, pill, icon, title, meta (${bad.slice(0, 4).join('; ')})`);
    ok(await page.evaluate(() => [...document.querySelectorAll('.pill')].every((p) => /Beginner|Intermediate|Advanced/.test(p.textContent))), 'AC17: every pill contains the level word');
    await s.context.close();
  }
  // AC7: a drill with no length shows no dangling separator; a removed resource makes no request.
  {
    const s = await fresh(browser);
    await s.page.route('**/js/content.js', async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace("length: '1:23'", 'length: null') });
    });
    await open(s.page, '#/');
    const pill = await s.page.textContent('a[href="#/drills/hundred-dribble"] .pill');
    ok(pill.trim() === 'Beginner', `AC7: no length -> no dangling separator ("${pill.trim()}")`);
    await s.context.close();
  }

  // ---- AC8 to AC12: the three selects
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    const sel = await page.evaluate(() => [...document.querySelectorAll('select')].map((e) => ({
      id: e.id, label: document.querySelector(`label[for="${e.id}"]`) && document.querySelector(`label[for="${e.id}"]`).textContent,
      labelVisible: !!document.querySelector(`label[for="${e.id}"]`) && document.querySelector(`label[for="${e.id}"]`).getClientRects().length > 0,
      options: [...e.options].map((o) => o.text), inForm: !!e.closest('form') })));
    ok(sel.length === 3, `AC8: exactly three selects (${sel.length})`);
    ok(JSON.stringify(sel.map((x) => x.label)) === JSON.stringify(['Skill', 'Level', 'Needs']) && sel.every((x) => x.labelVisible), `AC8: visible labels Skill, Level, Needs (${sel.map((x) => x.label)})`);
    ok(JSON.stringify(sel[0].options) === JSON.stringify(['All skills', ...CONTENT.skillNames]), `AC8: Skill options (${sel[0].options})`);
    ok(JSON.stringify(sel[1].options) === JSON.stringify(['Any level', 'Beginner', 'Intermediate']), `AC8: Level options today (${sel[1].options})`);
    ok(JSON.stringify(sel[1].options) === JSON.stringify(['Any level', ...CONTENT.levels]), `AC8: Level options derived (${sel[1].options})`);
    ok(JSON.stringify(sel[2].options) === JSON.stringify(['Any', 'Just me', 'Partner or group', 'A hoop']), `AC8: Needs options (${sel[2].options})`);
    ok(sel.every((x) => x.options.every((o) => !/\d/.test(o)) ) , 'AC8: no option text has a digit');
    ok(sel.every((x) => !x.inForm), 'AC26: no select inside a form');
    // AC9 idle
    ok((await page.textContent('#find-result')).trim() === 'Showing 18 drills', 'AC9: idle result line "Showing 18 drills"');
    ok(await page.locator('#find-summary').innerHTML() === '' && await page.locator('[data-action="clear"]').count() === 0, 'AC9: idle -> no summary row, no Clear all');
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    await s.page.route('**/js/content.js', async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace("level: 'Beginner'", "level: 'Advanced'") });
    });
    await open(s.page, '#/');
    const opts = await s.page.evaluate(() => [...document.getElementById('f-level').options].map((o) => o.text));
    ok(JSON.stringify(opts) === JSON.stringify(['Any level', 'Beginner', 'Intermediate', 'Advanced']), `AC8: with one Advanced drill, Level gains Advanced (${opts})`);
    await s.context.close();
  }
  // AC9 active state, AC10 select behaviour, AC26 storage (fresh context; one scenario)
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    await page.evaluate(PROBE.logStart);
    await page.evaluate(() => { window.__marks = ['.finder', '#find-result', '#find-summary', '#find-list', 'h1'].map((q) => { const e = document.querySelector(q); e.__m = 1; return q; }); document.getElementById('f-skill').__m = 1; document.getElementById('f-level').__m = 1; document.getElementById('f-setup').__m = 1; });
    const hash0 = await page.evaluate(() => location.hash);
    const idleStyle = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('f-level')); return [c.backgroundColor, c.borderTopColor]; });
    const steps = [['#f-skill', 'ball-handling'], ['#f-level', 'Beginner'], ['#f-setup', 'solo']];
    let n = 0;
    for (const [q, v] of steps) {
      await page.focus(q);
      await page.selectOption(q, v); n++;
      const st = await page.evaluate((q2) => ({ focus: document.activeElement.id, want: q2.slice(1), hash: location.hash, ls: localStorage.length + sessionStorage.length, ck: document.cookie }), q);
      ok(st.focus === st.want, `AC10 ${q}: focus stays on the select (${st.focus})`);
      ok(st.hash === hash0, `AC10 ${q}: hash unchanged`);
      ok(st.ls === 0 && st.ck === '', `AC10 ${q}: nothing stored`);
    }
    const st = await page.evaluate(() => ({
      marks: ['.finder', 'h1', '#find-result', '#find-summary', '#find-list'].map((q) => !!document.querySelector(q).__m),
      selMarks: ['f-skill', 'f-level', 'f-setup'].map((i) => !!document.getElementById(i).__m),
      summary: document.getElementById('find-summary').textContent,
      result: document.getElementById('find-result').textContent,
      cards: document.querySelectorAll('#find-list a.dcard').length,
      active: ['f-skill', 'f-level', 'f-setup'].map((i) => { const c = getComputedStyle(document.getElementById(i)); return [c.backgroundColor, c.borderTopColor]; }),
      countEls: [...document.querySelectorAll('#view *')].filter((e) => e.children.length === 0 && /\b\d+ drills?\b/.test(e.textContent)).length,
      liveInView: document.querySelectorAll('#view [role="status"], #view [aria-live], #view [role="alert"]').length,
      liveAll: document.querySelectorAll('[role="status"], [aria-live]').length,
    }));
    ok(st.selMarks.every(Boolean) && st.marks.every(Boolean), `AC10: selects, h1 and their wrappers are the same nodes after three changes (${st.selMarks}/${st.marks}) -> only list, result and summary repainted`);
    ok(/Ball handling/.test(st.summary) && /Beginner/.test(st.summary) && /Just me/.test(st.summary), `AC9: summary names all three (${st.summary})`);
    ok(st.result.trim() === 'Showing 2 drills' && st.cards === 2, `AC9: result line says 2 drills and 2 cards render (${st.result}/${st.cards})`);
    ok(st.active.every((a) => a[0] === 'rgb(255, 106, 19)' && a[1] === 'rgb(22, 24, 29)') && idleStyle[0] === 'rgb(255, 255, 255)', `AC9: active selects have an orange fill and ink border; idle is white (${JSON.stringify(st.active)} vs ${idleStyle})`);
    ok(st.countEls === 1, `AC9: the count appears in exactly one visible element (${st.countEls})`);
    ok(st.liveInView === 0 && st.liveAll === 1, `AC10/D: #status is the only live region (${st.liveInView}/${st.liveAll})`);
    const log = await page.evaluate(() => window.__log);
    ok(log.length === n, `AC10: ${n} changes announced exactly ${n} times (${log.length}: ${JSON.stringify(log)})`);
    ok(/2 drills/.test(log[n - 1]) && /Ball handling/.test(log[n - 1]) && /Just me/.test(log[n - 1]), `AC10: the announcement carries the count and active values (${log[n - 1]})`);
    ok(await page.evaluate(() => document.activeElement.id) === 'f-setup', 'AC10: focus stays on the select that changed');
    await s.context.close();
  }
  // AC10 by keyboard: ArrowDown on the focused select changes it, focus stays, one announcement.
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    await page.evaluate(PROBE.logStart);
    await page.focus('#f-level');
    await page.keyboard.press('ArrowDown');
    const st = await page.evaluate(() => ({ v: document.getElementById('f-level').value, f: document.activeElement.id, h: location.hash, log: window.__log.length, res: document.getElementById('find-result').textContent }));
    ok(st.v === 'Beginner' && st.f === 'f-level' && st.h === '#/' && st.log === 1 && /Showing 1[0-9] drills|Showing [0-9] drills/.test(st.res), `AC10: keyboard change keeps focus on the select, hash unchanged, announced once (${JSON.stringify(st)})`);
    await s.context.close();
  }
  // AC11 Clear all; AC12 empty state; both from a fresh context each.
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    await setFilters(page, { skill: 'ball-handling', level: 'Beginner', setup: 'solo' });
    await page.evaluate(PROBE.logStart);
    const box = await page.locator('[data-action="clear"]').first().boundingBox();
    ok(box.width >= 44 && box.height >= 44, `AC11: Clear all is at least 44x44 (${box.width}x${box.height})`);
    await page.click('[data-action="clear"]');
    const st = await page.evaluate(() => ({ vals: ['f-skill', 'f-level', 'f-setup'].map((i) => document.getElementById(i).selectedIndex), cards: document.querySelectorAll('#find-list a.dcard').length, focus: document.activeElement.id, log: window.__log.length, summary: document.getElementById('find-summary').innerHTML, active: document.querySelectorAll('select[data-active]').length }));
    ok(JSON.stringify(st.vals) === '[0,0,0]' && st.cards === 18 && st.summary === '' && st.active === 0, `AC11: Clear all resets all three, shows 18 cards (${JSON.stringify(st)})`);
    ok(st.focus === 'f-skill', `AC11: focus moves to the Skill select (${st.focus})`);
    ok(st.log === 1, `AC11: Clear all announces once (${st.log})`);
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    await setFilters(page, { skill: 'shooting', level: 'Intermediate', setup: 'solo' });
    const st = await page.evaluate(() => ({ cards: document.querySelectorAll('#find-list a.dcard').length, empty: document.querySelector('#find-list .empty') && document.querySelector('#find-list .empty').textContent, h: document.querySelector('#find-list .empty h2') && document.querySelector('#find-list .empty h2').textContent }));
    ok(st.cards === 0 && st.h === 'No drills match', `AC12: Shooting + Intermediate + Just me -> 0 cards and "No drills match" (${st.cards}/${st.h})`);
    ok(/Shooting/.test(st.empty) && /Intermediate/.test(st.empty) && /Just me/.test(st.empty), 'AC12: the empty state names Shooting, Intermediate and Just me');
    ok(/Just me to see 1 drill\b/.test(st.empty), `AC12: the reason says removing Just me gives 1 drill (${st.empty})`);
    ok(await page.getByRole('button', { name: 'Show all drills' }).count() === 1, 'AC12: a "Show all drills" button is shown');
    await page.evaluate(PROBE.logStart);
    await page.getByRole('button', { name: 'Show all drills' }).click();
    const st2 = await page.evaluate(() => ({ cards: document.querySelectorAll('#find-list a.dcard').length, focus: document.activeElement.id, vals: ['f-skill', 'f-level', 'f-setup'].map((i) => document.getElementById(i).selectedIndex), log: window.__log.length }));
    ok(st2.cards === 18 && st2.focus === 'f-skill' && JSON.stringify(st2.vals) === '[0,0,0]' && st2.log === 1, `AC12: Show all drills behaves like Clear all (${JSON.stringify(st2)})`);
    await s.context.close();
  }
  // AC12: every 2- and 3-filter combination. One page, deliberately shared: this scenario is about the combinations.
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    const skills = [null, ...GROUPS], levels = [null, ...CONTENT.levels], setups = [null, ...CONTENT.setups.map((x) => x.key)];
    let combos = 0, empties = 0; const wrong = [];
    for (const sk of skills) for (const lv of levels) for (const su of setups) {
      if ([sk, lv, su].filter(Boolean).length < 2) continue;
      await setFilters(page, { skill: sk || '', level: lv || '', setup: su || '' });
      const want = DRILLS.filter((k) => { const m = CONTENT.meta[k]; return (!sk || m.group === sk) && (!lv || m.level === lv) && (!su || m.setup.includes(su)); }).length;
      const got = await page.evaluate(() => ({ n: document.querySelectorAll('#find-list a.dcard').length, empty: !!document.querySelector('#find-list .empty'), reason: document.querySelector('#find-list .empty p') ? document.querySelector('#find-list .empty p').textContent.trim() : '', btn: !!document.querySelector('#find-list .empty [data-action="clear"]'), res: document.getElementById('find-result').textContent }));
      combos++;
      if (got.n !== want || got.empty !== (want === 0) || !new RegExp(`Showing ${want} drills?$`).test(got.res.trim())) wrong.push(`${sk}/${lv}/${su}: want ${want} got ${got.n}`);
      if (want === 0) { empties++; if (got.reason.length < 20 || !got.btn) wrong.push(`${sk}/${lv}/${su}: empty state incomplete`); }
    }
    ok(wrong.length === 0 && combos > 50 && empties >= 1, `AC12: all ${combos} two- and three-filter combinations give the right cards, and ${empties} empty ones have a reason and a button (${wrong.slice(0, 3).join('; ')})`);
    await s.context.close();
  }

  // ---- AC15: drill page DOM order, facts, no "Length:" in the credit, More drills
  for (const d of DRILLS) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, `#/drills/${d}`);
    const m = CONTENT.meta[d];
    const r = await page.evaluate(() => {
      const main = document.getElementById('view');
      const all = [...main.querySelectorAll('*')];
      const idx = (sel) => { const e = main.querySelector(sel); return e ? all.indexOf(e) : -1; };
      return {
        order: [idx('a.back'), idx('h1'), idx('.video'), idx('.credit'), idx('.facts'), idx('#doit-h'), idx('#cues-h'), idx('#why-h'), idx('#teaches-h'), idx('#more-h')],
        credit: main.querySelector('.credit').textContent, channel: main.querySelector('.credit a') && main.querySelector('.credit a').getAttribute('href'),
        facts: main.querySelector('.facts').textContent, factsLvl: main.querySelector('.facts .bars') && main.querySelector('.facts .lvl').textContent,
        more: [...main.querySelectorAll('section[aria-labelledby="more-h"] a.dcard--row')].map((a) => a.getAttribute('href')),
        moreH: main.querySelector('#more-h').textContent, moreMeta: [...main.querySelectorAll('section[aria-labelledby="more-h"] .dmeta')].every((e) => /Beginner|Intermediate|Advanced/.test(e.textContent)),
        moreImg: [...main.querySelectorAll('section[aria-labelledby="more-h"] a.dcard--row')].every((a) => a.querySelector('.dtitle') && a.querySelector('.thumb')),
        h1Rule: getComputedStyle(main.querySelector('h1')).borderBottomWidth, h2Rule: getComputedStyle(main.querySelector('#more-h')).borderBottomWidth, labelRule: getComputedStyle(main.querySelector('#why-h')).borderBottomWidth,
        doitLabelIsH2: main.querySelector('#doit-h').tagName,
      };
    }, undefined).catch(() => null);
    ok(!!r, `AC15 ${d}: probe ran`);
    if (!r) { await s.context.close(); continue; }
    ok(r.order.every((v, i) => v > -1 && (i === 0 || v > r.order[i - 1])), `AC15 ${d}: DOM order back, h1, video, credit, facts, Do it, cues, why, teaches, more (${r.order})`);
    ok(r.channel && r.channel.startsWith('https://www.youtube.com/') && !/Length:/.test(r.credit), `AC15 ${d}: credit links the channel and has no "Length:" (${r.channel})`);
    ok(/Beginner|Intermediate|Advanced/.test(r.facts) && r.factsLvl.includes(m.level) && /graded by us/i.test(r.facts) && /You need/.test(r.facts) && r.facts.includes(m.needs.join(', ')), `AC15/AC17 ${d}: facts have level word, You need, graded by us`);
    ok(m.length ? r.facts.includes(m.length) : !/Length/.test(r.facts), `AC15 ${d}: facts show the length when known (${m.length})`);
    const others = DRILLS.filter((k) => CONTENT.meta[k].group === m.group && k !== d).map((k) => `#/drills/${k}`);
    ok(JSON.stringify(r.more) === JSON.stringify(others) && r.moreMeta && r.moreImg, `AC15 ${d}: More drills lists the other drills of the skill as compact cards (${r.more})`);
    ok(/^More .+ drills$/.test(r.moreH), `AC15 ${d}: "More <skill> drills" heading ("${r.moreH}")`);
    ok(r.h1Rule === '4px' && r.h2Rule === '3px' && r.labelRule === '0px', `AC21 ${d}: h1 and list h2 carry the rule, in-card labels do not (${r.h1Rule}/${r.h2Rule}/${r.labelRule})`);
    await s.context.close();
  }

  // ---- AC13/AC14 video: play swaps in exactly one iframe; titles unique across drills
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

  // ---- Thumbnail aborted -> placeholder, play works, not "no longer available"
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

  // ---- Removed / empty / invalid id, and the Suggest link variant: serve a modified content.js
  async function withContent(transform, fn) {
    const s = await fresh(browser);
    await s.page.route('**/js/content.js', async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: transform(await res.text()) });
    });
    await fn(s);
    await s.context.close();
  }
  const GONE = async (s, what) => {
    await open(s.page, '#/drills/hundred-dribble');
    const st = await s.page.evaluate(() => ({ gone: /Video no longer available/.test(document.body.textContent), iframe: document.querySelectorAll('iframe').length, play: document.querySelectorAll('.video__play,.video__thumb').length }));
    ok(st.gone && st.iframe === 0 && st.play === 0, `AC14: ${what} -> message, no thumbnail, no iframe`);
    await open(s.page, '#/');
    const card = await s.page.evaluate(() => { const a = document.querySelector('a[href="#/drills/hundred-dribble"]'); return { img: !!a.querySelector('img'), none: !!a.querySelector('.thumb--none') }; });
    ok(!card.img && card.none, `AC7: ${what} -> the Home card shows a placeholder, no image (${JSON.stringify(card)})`);
    ok(!s.requests.some((u) => u.includes('ytimg') && u.includes('v_jqSQswdbU')), `AC7/AC14: ${what} -> no thumbnail request on the drill page or Home`);
  };
  await withContent((t) => t.replace("status: 'ok'", "status: 'removed'"), (s) => GONE(s, "status 'removed'"));
  await withContent((t) => t.replace("youtubeId: 'v_jqSQswdbU'", "youtubeId: ''"), async (s) => { await GONE(s, 'empty youtubeId'); ok(!s.requests.some((u) => u.includes('ytimg/vi//')), 'AC7: empty youtubeId -> no empty-id request'); });
  await withContent((t) => t.replace("youtubeId: 'v_jqSQswdbU'", "youtubeId: 'bad id!'"), (s) => GONE(s, 'invalid youtubeId'));

  // ---- AC23: Suggest control in the footer on four routes (fresh context each)
  for (const hash of ['#/', '#/drills/form-shooting', '#/positions', '#/nope']) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, hash);
    ok(await page.locator('button[data-action="suggest"]').count() === 1, `AC23 ${hash}: Suggest a drill button present once`);
    const vis0 = await page.locator('#suggest-note').isVisible();
    await page.focus('button[data-action="suggest"]');
    await page.keyboard.press('Enter');
    ok(!vis0 && await page.locator('#suggest-note').isVisible(), `AC23 ${hash}: activating reveals the explanation`);
    ok(await page.evaluate(() => document.activeElement.dataset.action) === 'suggest', `AC23 ${hash}: focus stays on the button`);
    ok(await page.getAttribute('button[data-action="suggest"]', 'aria-expanded') === 'true', `AC23 ${hash}: aria-expanded true`);
    await page.keyboard.press('Enter');
    ok(!(await page.locator('#suggest-note').isVisible()), `AC23 ${hash}: second press hides it again`);
    ok(await page.getAttribute('button[data-action="suggest"]', 'aria-expanded') === 'false', `AC23 ${hash}: aria-expanded false again`);
    await s.context.close();
  }
  await withContent((t) => t.replace("suggestFormUrl: ''", "suggestFormUrl: 'https://forms.gle/example'"), async (s) => {
    for (const hash of ['#/', '#/drills/form-shooting', '#/positions', '#/nope']) {
      await open(s.page, hash);
      const a = await s.page.evaluate(() => { const e = [...document.querySelectorAll('a')].find((x) => /Suggest a drill/.test(x.textContent)); return e && { href: e.getAttribute('href'), rel: e.getAttribute('rel'), inFooter: !!e.closest('footer') }; });
      ok(a && a.href === 'https://forms.gle/example' && a.rel === 'noopener' && a.inFooter, `AC23 ${hash}: with a URL it is an external link rel=noopener in the footer (${JSON.stringify(a)})`);
      ok(await s.page.locator('button[data-action="suggest"]').count() === 0, `AC23 ${hash}: no button when URL is set`);
    }
  });

  // ---- AC16: origin. A fresh context for every scenario (a hash change is not a reload).
  const backOf = (page) => page.evaluate(() => { const a = document.querySelector('#view a.back'); return { href: a.getAttribute('href'), label: a.textContent.replace('←', '').trim() }; });
  const currentTab = (page) => page.evaluate(() => [...document.querySelectorAll('[data-tab][aria-current="page"]')].map((a) => a.dataset.tab));
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    await setFilters(page, { skill: 'shooting', level: 'Beginner' });
    const n0 = await cards(page);
    await page.click('#find-list a.dcard');
    await page.waitForSelector('#view .facts');
    const b = await backOf(page);
    ok(b.href === '#/' && b.label === 'Drills' && JSON.stringify(await currentTab(page)) === '["drills"]', `AC16a: from Find, Back is "Drills" -> #/ and Drills is current (${JSON.stringify(b)})`);
    await page.click('#view a.back');
    await page.waitForSelector('#f-skill');
    const st = await page.evaluate(() => ({ hash: location.hash, skill: document.getElementById('f-skill').value, level: document.getElementById('f-level').value, setup: document.getElementById('f-setup').value, cards: document.querySelectorAll('#find-list a.dcard').length, focus: document.activeElement.id, scrollY: window.scrollY }));
    ok(st.hash === '#/' && st.skill === 'shooting' && st.level === 'Beginner' && st.setup === '' && st.cards === n0 && st.focus === 'page-title', `AC16a: Back restores the filters and the list, focus on the title (${JSON.stringify(st)} vs ${n0})`);
    await s.context.close();
  }
  for (const [slug, label] of [['point-guard', 'Point guard'], ['small-forward', 'Small forward']]) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, `#/positions/${slug}`);
    await page.click('a.dcard--row');
    await page.waitForSelector('#view .facts');
    const b = await backOf(page);
    ok(b.href === `#/positions/${slug}` && b.label === label && JSON.stringify(await currentTab(page)) === '["positions"]', `AC16b: from ${slug}, Back is "${label}" and Positions is current (${JSON.stringify(b)})`);
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/drills/form-shooting');
    const b = await backOf(page);
    ok(b.href === '#/skills/shooting' && b.label === 'Shooting' && JSON.stringify(await currentTab(page)) === '["drills"]', `AC16c: deep link -> Back is "Shooting" -> #/skills/shooting, Drills current (${JSON.stringify(b)})`);
    await s.context.close();
  }
  for (const [start, want, label] of [['#/positions/point-guard', '#/positions/point-guard', 'Point guard'], ['#/', '#/', 'Drills']]) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, start);
    await page.click('a.dcard');
    await page.waitForSelector('#view .facts');
    const first = await page.evaluate(() => document.getElementById('page-title').textContent);
    await page.click('section[aria-labelledby="more-h"] a.dcard--row');
    await page.waitForFunction((t) => document.getElementById('page-title').textContent !== t, first);
    const b = await backOf(page);
    ok(b.href === want && b.label === label, `AC16d: drill -> More drill, Back still goes to ${want}, not the first drill (${JSON.stringify(b)})`);
    await page.click('#view a.back');
    await page.waitForSelector('#page-title');
    ok(await page.evaluate(() => location.hash) === want, `AC16d: clicking Back from the second drill lands on ${want}`);
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/positions/zone');
    await page.click('a.dcard--row');
    await page.waitForSelector('#view .facts');
    const b = await backOf(page);
    ok(b.href === '#/positions/zone' && b.label === 'Zone defence' && JSON.stringify(await currentTab(page)) === '["positions"]', `AC16e: from the zone, Back is "Zone defence" and Positions is current (${JSON.stringify(b)})`);
    await s.context.close();
  }
  // Browser Back from a drill re-renders the origin without throwing; #/skills/:slug sets Skill only.
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/skills/shooting');
    ok(await page.evaluate(() => document.getElementById('f-skill').value) === 'shooting', 'AC19: #/skills/shooting selects Shooting');
    await page.click('#find-list a.dcard');
    await page.waitForSelector('#view .facts');
    await page.goBack();
    await page.waitForSelector('#f-skill');
    ok(await page.evaluate(() => document.getElementById('f-skill').value) === 'shooting' && s.errors.length === 0, `AC16: browser Back re-applies the skill without errors (${s.errors.join(';')})`);
    await page.selectOption('#f-level', 'Beginner');
    await page.evaluate(() => { location.hash = '#/skills/footwork'; });
    await page.waitForFunction(() => document.getElementById('f-skill').value === 'footwork');
    ok(await page.evaluate(() => document.getElementById('f-level').value) === 'Beginner', 'D-c: opening #/skills/:slug sets Skill and leaves Level alone');
    await s.context.close();
  }

  // ---- AC18 to AC21: Positions, position pages, zone
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/positions');
    const r = await page.evaluate(() => ({
      fams: [...document.querySelectorAll('.group')].map((g) => g.querySelector('h2').textContent + ':' + [...g.querySelectorAll('.sched__name')].map((x) => x.textContent).join(',')),
      cards: [...document.querySelectorAll('a.sched')].map((a) => ({ txt: a.textContent.replace(/\s+/g, ' ').trim(), badge: a.querySelector('.badge').textContent.trim(), chev: !!a.querySelector('.chev svg'), href: a.getAttribute('href'), nested: a.querySelectorAll('a').length })),
      h2s: [...document.querySelectorAll('#view h2')].map((h) => h.textContent), li: document.querySelectorAll('#view li > a.sched').length,
    }));
    ok(JSON.stringify(r.fams) === JSON.stringify(['Guards:Point guard,Shooting guard', 'Wings:Small forward', 'Bigs:Power forward,Centre', 'Team defence:Zone defence']), `AC18: positions grouped (${JSON.stringify(r.fams)})`);
    ok(JSON.stringify(r.h2s) === JSON.stringify(['Guards', 'Wings', 'Bigs', 'Team defence']), `AC18: family h2s in order (${r.h2s})`);
    const pg = r.cards[0];
    ok(pg.txt === `Position 1 Guards 1 Point guard ${CONTENT.posDrills['point-guard']} drills` && CONTENT.posDrills['point-guard'] === 6 && pg.badge === '1' && pg.chev, `AC18: Point guard card (${pg.txt})`);
    const zc = r.cards[r.cards.length - 1];
    ok(zc.txt === 'Team The 2-3 zone Zone defence 5 spots' && zc.href === '#/positions/zone', `AC18: Zone card reads Team / The 2-3 zone / Zone defence / 5 spots (${zc.txt})`);
    ok(r.cards.length === 6 && r.cards.every((c) => c.nested === 0), 'AC18: six cards, each one link with no nested link');
    await s.context.close();
  }
  for (const p of POS) {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, `#/positions/${p}`);
    const h = await page.textContent('h1');
    ok(/^Playing .+\? Start here$/.test(h), `AC19 ${p}: h1 "${h}"`);
    ok(await page.locator('.page-head__lead').count() === 1, `AC19 ${p}: lead kept`);
    const r = await page.evaluate(() => ({
      drills: document.querySelectorAll('#pos-drills ~ ul a.dcard--row, section[aria-labelledby="pos-drills"] a.dcard--row').length,
      skills: [...document.querySelectorAll('section[aria-labelledby="pos-skills"] a.sched--one')].map((a) => ({ href: a.getAttribute('href'), txt: a.textContent.replace(/\s+/g, ' ').trim(), icon: !!a.querySelector('.badge svg') })),
      rules: ['pos-drills', 'pos-skills'].map((i) => getComputedStyle(document.getElementById(i)).borderBottomWidth),
    }));
    ok(r.drills === CONTENT.posDrills[p], `AC19 ${p}: lists its ${CONTENT.posDrills[p]} drills as compact cards (${r.drills})`);
    ok(r.skills.length === 6 && GROUPS.every((g, i) => r.skills[i].href === `#/skills/${g}` && r.skills[i].icon && r.skills[i].txt === `${CONTENT.skillNames[i]} 3 drills`), `AC19 ${p}: All six skills as single-row cards (${JSON.stringify(r.skills.map((x) => x.txt))})`);
    ok(r.rules.every((w) => w === '3px'), `AC21 ${p}: list h2s carry the rule (${r.rules})`);
    ok(await page.evaluate(() => [...document.querySelectorAll('.dcard--row .dmeta')].every((e) => /Beginner|Intermediate|Advanced/.test(e.textContent))), `AC17 ${p}: every compact card has the level word`);
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/positions/point-guard');
    await page.click('a.sched--one[href="#/skills/ball-handling"]');
    await page.waitForSelector('#f-skill');
    const r = await page.evaluate(() => ({ skill: document.getElementById('f-skill').value, tab: document.querySelector('[data-tab][aria-current="page"]').dataset.tab, cards: document.querySelectorAll('#find-list a.dcard').length }));
    ok(r.skill === 'ball-handling' && r.tab === 'drills' && r.cards === 3, `AC19: a skill link opens Find with the skill selected and Drills current (${JSON.stringify(r)})`);
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/positions/zone');
    const z = await page.evaluate(() => ({
      h1: document.querySelector('h1').textContent,
      cards: [...document.querySelectorAll('.sched--info')].map((c) => ({ t: c.querySelector('h3') ? c.querySelector('h3').textContent : '', d: c.querySelectorAll('a[href^="#/drills/"]').length, isLink: c.tagName === 'A', nested: c.querySelectorAll('a a').length })),
      anyNested: document.querySelectorAll('a a, a .sched').length,
      rules: ['z-spots', 'z-core', 'z-reb'].map((i) => getComputedStyle(document.getElementById(i)).borderBottomWidth),
      labelRule: getComputedStyle(document.querySelector('.card__label')).borderBottomWidth,
    }));
    ok(z.cards.length === 8 && z.cards.every((c) => c.d >= 1 && !c.isLink && c.nested === 0), `AC20: zone spots, core skills and rebounding are 8 schedule cards, each linking a drill, none a link itself (${JSON.stringify(z.cards)})`);
    ok(z.anyNested === 0, 'AC20: no nested links');
    ok(z.rules.every((w) => w === '3px') && z.labelRule === '0px', `AC21: zone h2s carry the rule, in-card labels do not (${z.rules}/${z.labelRule})`);
    const ztext = await page.textContent('#view');
    ok(['Top guards', 'Wings', 'Middle', 'Stance and slides', 'Closeouts', 'Talking', 'Rotating', 'Rebounding'].every((w) => ztext.includes(w)), 'AC20: zone page names every part');
    await s.context.close();
  }
  {
    const s = await fresh(browser);
    const { page } = s;
    await open(page, '#/');
    const r = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('h1')).borderBottomWidth, col: getComputedStyle(document.querySelector('h1')).borderBottomColor }));
    ok(r.h1 === '4px' && r.col === 'rgb(255, 106, 19)', `AC21: the Home h1 carries the 4px orange rule (${JSON.stringify(r)})`);
    await page.click('a.tab[data-tab="positions"]');
    await page.waitForFunction(() => document.getElementById('page-title').textContent === 'Positions');
    ok(await page.evaluate(() => document.querySelectorAll('.group__title').length) === 4, 'AC21: family names stay h2 labels');
    ok(await page.evaluate(() => [...document.querySelectorAll('.group__title')].every((h) => getComputedStyle(h).borderBottomWidth === '0px')), 'AC21: family labels carry no rule');
    await s.context.close();
  }

  // ---- AC4: no focus ring is drawn against an accent fill. Rings sit outside the control.
  {
    const s = await fresh(browser, { width: 390 });
    const { page } = s;
    await open(page, '#/');
    await page.selectOption('#f-skill', 'shooting');
    await page.focus('#f-skill');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => { const e = document.getElementById('f-skill'); const cs = getComputedStyle(e); return { focus: document.activeElement.id, vis: e.matches(':focus-visible'), ow: cs.outlineWidth, off: cs.outlineOffset, oc: cs.outlineColor }; });
    ok(r.focus === 'f-skill' && r.vis && parseFloat(r.off) >= 2 && parseFloat(r.ow) >= 3 && r.oc === 'rgb(185, 60, 10)', `AC4: the active (orange) select's ring is outside it, 3px dark orange, offset >= 2px (${JSON.stringify(r)})`);
    await open(page, '#/drills/form-shooting');
    const d = await page.evaluate(() => { const e = document.querySelector('.doit'); return { focusable: e.querySelectorAll('a,button,[tabindex]').length, bg: getComputedStyle(e).backgroundColor }; });
    ok(d.focusable === 0 && d.bg === 'rgb(255, 106, 19)', `AC4: the Do it block is orange and holds no focusable control (${JSON.stringify(d)})`);
    await s.context.close();
  }

  // ---- AC22: About is gone
  {
    const s = await fresh(browser);
    await open(s.page, '#/about');
    ok(/not found/i.test(await s.page.textContent('h1')) && await s.page.evaluate(() => location.hash) === '#/about', 'AC22: #/about shows Not found with the URL kept');
    const gone = await s.page.evaluate(async () => { const r = await fetch('js/views/about.js'); return r.status; });
    ok(gone === 404, `AC22: js/views/about.js is not served (${gone})`);
    await s.context.close();
  }

  await browser.close();
  console.log(`${checks} checks, ${fails} failed`);
  if (fails) { console.log(failures.slice(0, 40).join('\n')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
