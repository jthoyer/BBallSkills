import { positions, skills, zones, getPosition } from '../content.js';
import { esc, pageHeader, backLink, icon, scheduleCard, drillCards, skillLinks } from '../ui.js';

const FAMILIES = ['Guards', 'Wings', 'Bigs'];

/** The spots, summed from the zone's spot counts (2 + 2 + 1 = 5). */
const zoneSpots = () => zones['2-3'].spots.reduce((n, s) => n + s.count, 0);

/** #/positions: positions grouped by family, then a link to Zone defence. */
export function positionsView() {
  const groups = FAMILIES.map((family) => {
    const cards = positions
      .filter((p) => p.family === family)
      .map((p) =>
        scheduleCard({
          href: `#/positions/${p.slug}`,
          name: p.name,
          badge: String(p.number),
          left: `Position ${p.number}`,
          right: p.family,
          count: `${p.drills.length} drills`
        })
      )
      .join('');
    return `
      <section class="group" aria-labelledby="fam-${esc(family)}">
        <h2 class="group__title" id="fam-${esc(family)}">${esc(family)}</h2>
        <ul class="list list--tight">${cards}</ul>
      </section>`;
  }).join('');
  return {
    title: 'Positions',
    html: `
      ${pageHeader({ title: 'Positions', lead: 'Every player learns every skill. Start with the drills that suit your spot.' })}
      ${groups}
      <section class="group" aria-labelledby="fam-team">
        <h2 class="group__title" id="fam-team">Team defence</h2>
        <ul class="list list--tight">${scheduleCard({
          href: '#/positions/zone',
          name: 'Zone defence',
          badge: icon('defence'),
          badgeIsIcon: true,
          left: 'Team',
          right: 'The 2-3 zone',
          count: `${zoneSpots()} spots`
        })}</ul>
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
        <h2 class="rule rule--2" id="pos-drills">Drills for a ${esc(name)}</h2>
        ${drillCards(p.drills, { compact: true })}
      </section>
      <section class="group" aria-labelledby="pos-skills">
        <h2 class="rule rule--2" id="pos-skills">All six skills</h2>
        ${skillLinks(skills)}
      </section>`
  };
}

/** One zone card: a schedule card that holds drill links, so it is not a link itself. */
function zoneCard({ name, left, right, text, drillKeys }) {
  return `
      <li class="sched sched--info">
        <span class="sched__top"><b>${esc(left)}</b> <span>${esc(right)}</span></span>
        <h3 class="sched__name">${esc(name)}</h3>
        <p>${esc(text)}</p>
        <p class="card__label">Practise it</p>
        ${drillCards(drillKeys, { compact: true })}
      </li>`;
}

const drillsText = (keys) => `${keys.length} ${keys.length === 1 ? 'drill' : 'drills'}`;

/** #/positions/zone: the 2-3 zone. */
export function zoneView() {
  const z = zones['2-3'];
  const spots = z.spots
    .map((s) => zoneCard({ name: s.name, left: 'Spot', right: `${s.count} ${s.count === 1 ? 'player' : 'players'}`, text: s.guards, drillKeys: s.drills }))
    .join('');
  const core = z.coreSkills
    .map((c) => zoneCard({ name: c.name, left: 'Core skill', right: drillsText(c.drills), text: c.text, drillKeys: c.drills }))
    .join('');
  return {
    title: z.title,
    html: `
      ${backLink('#/positions', 'Positions')}
      ${pageHeader({ title: z.title, lead: z.intro })}
      <section class="group" aria-labelledby="z-spots">
        <h2 class="rule rule--2" id="z-spots">The five spots</h2>
        <ul class="list list--tight">${spots}</ul>
      </section>
      <section class="group" aria-labelledby="z-core">
        <h2 class="rule rule--2" id="z-core">Core skills</h2>
        <ul class="list list--tight">${core}</ul>
      </section>
      <section class="group" aria-labelledby="z-reb">
        <h2 class="rule rule--2" id="z-reb">Rebounding from the zone</h2>
        <ul class="list list--tight">${zoneCard({ name: 'Rebounding', left: 'Team', right: drillsText(z.rebounding.drills), text: z.rebounding.text, drillKeys: z.rebounding.drills })}</ul>
      </section>`
  };
}
