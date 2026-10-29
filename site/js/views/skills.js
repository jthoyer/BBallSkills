import { skills, getSkill, getDrill, LEVELS } from '../content.js';
import { esc, pageHeader, backLink, skillLinks, drillRows, suggestControl } from '../ui.js';

/** Skills tab: the six groups, then Suggest a drill. */
export function skillsView() {
  return {
    title: 'Skills',
    html: `
      ${pageHeader({ title: 'Skills', lead: 'Pick a group. Watch. Do it.' })}
      ${skillLinks(skills)}
      ${suggestControl()}`
  };
}

/** The drills in a group at a level ('All' = every level), as a list or an empty state. */
export function groupList(slug, level = 'All') {
  const skill = getSkill(slug);
  if (!skill) return '';
  const keys = skill.drills.filter((k) => {
    const d = getDrill(k);
    return d && d.group === slug && (level === 'All' || d.level === level);
  });
  if (!keys.length) {
    return `<p class="empty">No ${esc(level)} drills in ${esc(skill.name)} yet. Try another level.</p>`;
  }
  return drillRows(keys);
}

/** Text announced to screen readers after a filter change. */
export function filterStatus(slug, level) {
  const skill = getSkill(slug);
  const n = skill
    ? skill.drills.filter((k) => {
        const d = getDrill(k);
        return d && d.group === slug && (level === 'All' || d.level === level);
      }).length
    : 0;
  const which = level === 'All' ? '' : `${level} `;
  return `Showing ${n} ${which}${n === 1 ? 'drill' : 'drills'}`;
}

/** #/skills/:slug. Returns null for an unknown slug (caller shows not-found). */
export function skillGroupView(slug) {
  const skill = getSkill(slug);
  if (!skill) return null;
  const buttons = ['All', ...LEVELS]
    .map(
      (lv) =>
        `<button class="filter__btn" type="button" data-action="filter" data-level="${esc(lv)}" aria-pressed="${lv === 'All'}">${esc(lv)}</button>`
    )
    .join('');
  return {
    title: skill.name,
    html: `
      ${backLink('#/', 'Skills')}
      ${pageHeader({ title: skill.name })}
      <div class="filter" role="group" aria-label="Filter by level" data-group="${esc(slug)}">${buttons}</div>
      <div id="drill-list">${groupList(slug, 'All')}</div>`
  };
}
