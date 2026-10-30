import { skills, drills, LEVELS, SETUPS, getSkill } from '../content.js';
import { esc, pageHeader, drillCards } from '../ui.js';

/**
 * The Find view: every drill in one list, narrowed by three selects.
 *
 * Filter state lives here, in memory, for the life of the page. It is never
 * written to the URL, storage or a cookie, so a reload resets it. `null`
 * means "any". Opening #/skills/:slug sets only the Skill value.
 */
export const filters = { skill: null, level: null, setup: null };

const ALL_KEYS = () => skills.flatMap((s) => s.drills);

function matches(key, f) {
  const d = drills[key];
  return (
    (!f.skill || d.group === f.skill) &&
    (!f.level || d.level === f.level) &&
    (!f.setup || d.setup.includes(f.setup))
  );
}

const matching = (f = filters) => ALL_KEYS().filter((k) => matches(k, f));
const plural = (n) => `${n} ${n === 1 ? 'drill' : 'drills'}`;

/** Select options, derived from content. Nothing but the "any" labels is hard-coded. */
export function filterOptions() {
  const keys = ALL_KEYS();
  return {
    skill: { label: 'Skill', any: 'All skills', items: skills.map((s) => ({ value: s.slug, label: s.name })) },
    level: {
      label: 'Level',
      any: 'Any level',
      items: LEVELS.filter((l) => keys.some((k) => drills[k].level === l)).map((l) => ({ value: l, label: l }))
    },
    setup: {
      label: 'Needs',
      any: 'Any',
      items: SETUPS.filter((s) => keys.some((k) => drills[k].setup.includes(s.key))).map((s) => ({ value: s.key, label: s.label }))
    }
  };
}

/** The names of the active filter values, in select order. */
function activeNames(f = filters) {
  const opts = filterOptions();
  return ['skill', 'level', 'setup']
    .filter((name) => f[name])
    .map((name) => opts[name].items.find((i) => i.value === f[name]).label);
}

const FIELD = { skill: 'f-skill', level: 'f-level', setup: 'f-setup' };

function selectHtml(name, opt) {
  const options = [{ value: '', label: opt.any }, ...opt.items]
    .map((i) => `<option value="${esc(i.value)}"${(filters[name] || '') === i.value ? ' selected' : ''}>${esc(i.label)}</option>`)
    .join('');
  return `
    <div class="sel sel--${name}">
      <label for="${FIELD[name]}">${esc(opt.label)}</label>
      <div class="sel__box">
        <select id="${FIELD[name]}" data-filter="${name}"${filters[name] ? ' data-active="true"' : ''}>${options}</select>
      </div>
    </div>`;
}

/** "Showing 18 drills". The count appears here and nowhere else on screen. */
export function resultLine() {
  return `Showing ${plural(matching().length)}`;
}

/** Summary row: names every active value plus Clear all. Empty when nothing is active. */
export function summaryHtml() {
  const names = activeNames();
  if (!names.length) return '';
  return `
    <div class="sumrow">
      <p class="sumrow__t">Filtered by <b>${esc(names.join(' · '))}</b></p>
      <button class="clear" type="button" data-action="clear">Clear all<span class="visually-hidden"> filters</span></button>
    </div>`;
}

/** Why a combination is empty: each active value whose removal alone gives results. */
function emptyReason() {
  const opts = filterOptions();
  const helps = ['skill', 'level', 'setup']
    .filter((name) => filters[name])
    .map((name) => {
      const n = matching({ ...filters, [name]: null }).length;
      const label = opts[name].items.find((i) => i.value === filters[name]).label;
      return n ? `${label} to see ${plural(n)}` : '';
    })
    .filter(Boolean);
  return helps.length
    ? `Take off ${helps.join(', or ')}.`
    : 'No single filter is the cause. Clear all to start again.';
}

export function listHtml() {
  const keys = matching();
  if (keys.length) return drillCards(keys);
  return `
    <div class="empty">
      <h2>No drills match</h2>
      <p>Nothing matches ${esc(activeNames().join(', '))}. ${esc(emptyReason())}</p>
      <button class="btn btn--solid" type="button" data-action="clear">Show all drills</button>
    </div>`;
}

/** Repaint only the result line, summary row and list. The selects are never touched. */
export function paintFind() {
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('find-result', esc(resultLine()));
  set('find-summary', summaryHtml());
  set('find-list', listHtml());
}

/** Text for the one live region (#status): the count and the active values. */
export function findAnnouncement(prefix = '') {
  const names = activeNames();
  return `${prefix}${resultLine()}${names.length ? `: ${names.join(', ')}` : ''}.`;
}

/** Set one filter. Used by the select change handler. */
export function setFilter(name, value) {
  if (Object.hasOwn(filters, name)) filters[name] = value || null;
}

/** Reset all three to "any". The caller resets the selects and moves focus. */
export function clearFilters() {
  filters.skill = filters.level = filters.setup = null;
}

/** Bring the selects' DOM state in line with the filters (used after Clear all). */
export function syncSelects() {
  document.querySelectorAll('select[data-filter]').forEach((sel) => {
    const v = filters[sel.dataset.filter] || '';
    sel.value = v;
    if (v) sel.setAttribute('data-active', 'true');
    else sel.removeAttribute('data-active');
  });
}

/**
 * #/, #/skills and #/skills/:slug. Returns null for an unknown slug (caller
 * shows not-found). A slug sets the Skill filter; the others are left alone.
 */
export function findView(slug) {
  if (slug !== undefined) {
    if (!getSkill(slug)) return null;
    filters.skill = slug;
  }
  const opts = filterOptions();
  return {
    title: 'Find a drill',
    html: `
      ${pageHeader({ title: 'Find a drill' })}
      <div class="finder">
        ${selectHtml('skill', opts.skill)}
        ${selectHtml('level', opts.level)}
        ${selectHtml('setup', opts.setup)}
      </div>
      <p class="result" id="find-result">${esc(resultLine())}</p>
      <div id="find-summary">${summaryHtml()}</div>
      <div id="find-list">${listHtml()}</div>`
  };
}
