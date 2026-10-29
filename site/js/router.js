/**
 * router.js: hash routing.
 *
 * Hash-based so deep links and Back work on GitHub Pages with no server
 * config. Routes:
 *   (empty), #, #/          Skills
 *   #/skills                Skills
 *   #/skills/:slug          Skill group (drills + level filter)
 *   #/drills/:slug          Drill
 *   #/positions             Positions
 *   #/positions/zone        Zone defence (reserved word, checked BEFORE :slug)
 *   #/positions/:slug       Position
 *   #/about                 About
 *   anything else           Not found (URL preserved, so Back still works)
 */

import { skillsView, skillGroupView } from './views/skills.js';
import { drillView } from './views/drill.js';
import { positionsView, positionView, zoneView } from './views/positions.js';
import { aboutView } from './views/about.js';
import { notFoundView } from './views/notFound.js';

const SITE_NAME = 'BBallSkills';

/** Parse `#/skills/shooting` into ['skills', 'shooting']. */
export function parseHash(hash) {
  return String(hash || '')
    .replace(/^#/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .map((part) => {
      // A malformed escape (e.g. "#/%") makes decodeURIComponent throw.
      // Fall back to the raw segment; it will not match a route.
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
}

/**
 * Resolve a hash to a rendered view.
 * @returns {{title:string, html:string, tab:string|null}}
 */
export function resolve(hash) {
  const parts = parseHash(hash);
  const [section, param] = parts;
  const notFound = () => ({ ...notFoundView(hash), tab: null });

  if (parts.length === 0) return { ...skillsView(), tab: 'skills' };

  if (section === 'skills' && parts.length === 1) return { ...skillsView(), tab: 'skills' };
  if (section === 'skills' && parts.length === 2) {
    const v = skillGroupView(param);
    return v ? { ...v, tab: 'skills' } : notFound();
  }

  if (section === 'drills' && parts.length === 2) {
    const v = drillView(param);
    return v ? { ...v, tab: 'skills' } : notFound();
  }

  if (section === 'positions' && parts.length === 1) return { ...positionsView(), tab: 'positions' };
  if (section === 'positions' && parts.length === 2) {
    // 'zone' is reserved: it must be matched before the :slug lookup.
    if (param === 'zone') return { ...zoneView(), tab: 'positions' };
    const v = positionView(param);
    return v ? { ...v, tab: 'positions' } : notFound();
  }

  if (section === 'about' && parts.length === 1) return { ...aboutView(), tab: 'about' };

  return notFound();
}

/**
 * Start routing.
 * @param {object} opts
 * @param {HTMLElement} opts.outlet  element the view HTML is written into
 * @param {NodeList} opts.tabs       tab anchors carrying data-tab
 */
export function startRouter({ outlet, tabs }) {
  let firstRender = true;

  function render() {
    let view;
    try {
      view = resolve(window.location.hash);
    } catch (err) {
      console.error('Failed to render route', window.location.hash, err);
      view = { ...notFoundView(window.location.hash), tab: null };
    }

    document.title = `${view.title} · ${SITE_NAME}`;
    outlet.innerHTML = view.html;

    tabs.forEach((tab) => {
      if (tab.dataset.tab === view.tab) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });

    if (firstRender) {
      // Do not steal focus on first load: the user has not navigated yet.
      firstRender = false;
      return;
    }

    // Real navigation: reset scroll, then move focus to the new <h1> without
    // letting focus() scroll the page (a drill page has a video above it).
    window.scrollTo(0, 0);
    const heading = outlet.querySelector('#page-title');
    if (heading) heading.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', render);
  render();
}
