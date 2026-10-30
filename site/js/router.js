/**
 * router.js: hash routing.
 *
 * Hash-based so deep links and Back work on GitHub Pages with no server
 * config. Routes:
 *   (empty), #, #/          Find a drill
 *   #/skills                Find a drill
 *   #/skills/:slug          Find a drill with that skill selected
 *   #/drills/:slug          Drill
 *   #/positions             Positions
 *   #/positions/zone        Zone defence (reserved word, checked BEFORE :slug)
 *   #/positions/:slug       Position
 *   anything else           Not found (URL preserved, so Back still works).
 *                           That includes the old About page, which no longer exists.
 */

import { findView } from './views/skills.js';
import { drillView } from './views/drill.js';
import { positionsView, positionView, zoneView } from './views/positions.js';
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
 * @param {string} hash
 * @param {{href:string,label:string,tab:string}|null} origin  the last non-drill
 *   route rendered; a drill page uses it for its Back link and current tab.
 * @returns {{title:string, html:string, tab:string|null, origin?:object}}
 *   `origin` is set when this route is one a drill can be opened from.
 */
export function resolve(hash, origin = null) {
  const parts = parseHash(hash);
  const [section, param] = parts;
  const notFound = () => ({ ...notFoundView(hash), tab: null });
  const FIND = { href: '#/', label: 'Drills', tab: 'drills' };

  if (parts.length === 0) return { ...findView(), tab: 'drills', origin: FIND };

  if (section === 'skills' && parts.length === 1) return { ...findView(), tab: 'drills', origin: FIND };
  if (section === 'skills' && parts.length === 2) {
    const v = findView(param);
    return v ? { ...v, tab: 'drills', origin: FIND } : notFound();
  }

  if (section === 'drills' && parts.length === 2) {
    const v = drillView(param, origin);
    return v ? { ...v, tab: origin ? origin.tab : 'drills' } : notFound();
  }

  if (section === 'positions' && parts.length === 1) return { ...positionsView(), tab: 'positions' };
  if (section === 'positions' && parts.length === 2) {
    // 'zone' is reserved: it must be matched before the :slug lookup.
    if (param === 'zone') {
      return { ...zoneView(), tab: 'positions', origin: { href: '#/positions/zone', label: 'Zone defence', tab: 'positions' } };
    }
    const v = positionView(param);
    return v ? { ...v, tab: 'positions', origin: { href: `#/positions/${param}`, label: v.title, tab: 'positions' } } : notFound();
  }

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
  // The last route a drill can be opened from, kept in memory only. A drill
  // page uses it for Back and for the current tab. Drill to drill leaves it
  // alone, so Back never loops between drills.
  let origin = null;

  function render() {
    let view;
    try {
      view = resolve(window.location.hash, origin);
      if (view.origin) origin = view.origin;
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
