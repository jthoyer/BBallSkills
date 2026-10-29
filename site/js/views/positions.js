import { positions, skills, zones, getPosition } from '../content.js';
import { esc, pageHeader, backLink, row, drillRows, skillLinks } from '../ui.js';

const FAMILIES = ['Guards', 'Wings', 'Bigs'];

/** #/positions: positions grouped by family, then a link to Zone defence. */
export function positionsView() {
  const groups = FAMILIES.map((family) => {
    const rows = positions
      .filter((p) => p.family === family)
      .map((p) => row({ href: `#/positions/${p.slug}`, title: p.name, number: String(p.number) }))
      .join('');
    return `
      <section class="group" aria-labelledby="fam-${esc(family)}">
        <h2 class="group__title" id="fam-${esc(family)}">${esc(family)}</h2>
        <ul class="rows">${rows}</ul>
      </section>`;
  }).join('');
  return {
    title: 'Positions',
    html: `
      ${pageHeader({ title: 'Positions', lead: 'Every player learns every skill. Start with the drills that suit your spot.' })}
      ${groups}
      <section class="group" aria-labelledby="fam-team">
        <h2 class="group__title" id="fam-team">Team defence</h2>
        <ul class="rows">${row({ href: '#/positions/zone', title: 'Zone defence', meta: 'The 2-3 zone' })}</ul>
      </section>`
  };
}

/** #/positions/:slug. Returns null for an unknown slug ('zone' is handled separately). */
export function positionView(slug) {
  const p = getPosition(slug);
  if (!p) return null;
  const name = p.name.toLowerCase();
  return {
    title: p.name,
    html: `
      ${backLink('#/positions', 'Positions')}
      ${pageHeader({ title: `Playing ${name}? Start here`, lead: `Position ${p.number}, ${p.family}. These drills suit this spot. Every player still learns every skill, so all six groups are below.` })}
      <section class="group" aria-labelledby="pos-drills">
        <h2 class="group__title" id="pos-drills">Drills for a ${esc(name)}</h2>
        ${drillRows(p.drills)}
      </section>
      <section class="group" aria-labelledby="pos-skills">
        <h2 class="group__title" id="pos-skills">All six skills</h2>
        ${skillLinks(skills)}
      </section>`
  };
}

/** #/positions/zone: the 2-3 zone. */
export function zoneView() {
  const z = zones['2-3'];
  const spots = z.spots
    .map(
      (s) => `
      <li class="card">
        <h3 class="card__title">${esc(s.name)} <span class="card__count">(${esc(s.count)})</span></h3>
        <p>${esc(s.guards)}</p>
        <p class="card__label">Practise it</p>
        ${drillRows(s.drills, 'rows rows--compact')}
      </li>`
    )
    .join('');
  const core = z.coreSkills
    .map(
      (c) => `
      <li class="card">
        <h3 class="card__title">${esc(c.name)}</h3>
        <p>${esc(c.text)}</p>
        <p class="card__label">Practise it</p>
        ${drillRows(c.drills, 'rows rows--compact')}
      </li>`
    )
    .join('');
  return {
    title: z.title,
    html: `
      ${backLink('#/positions', 'Positions')}
      ${pageHeader({ title: z.title, lead: z.intro })}
      <section class="group" aria-labelledby="z-spots">
        <h2 class="group__title" id="z-spots">The five spots</h2>
        <ul class="cards">${spots}</ul>
      </section>
      <section class="group" aria-labelledby="z-core">
        <h2 class="group__title" id="z-core">Core skills</h2>
        <ul class="cards">${core}</ul>
      </section>
      <section class="group" aria-labelledby="z-reb">
        <h2 class="group__title" id="z-reb">Rebounding from the zone</h2>
        <div class="card">
          <p>${esc(z.rebounding.text)}</p>
          <p class="card__label">Practise it</p>
          ${drillRows(z.rebounding.drills, 'rows rows--compact')}
        </div>
      </section>`
  };
}
