import { getDrill, getResource, getSkill } from '../content.js';
import { esc, pageHeader, backLink, levelLabel, videoBlock, sourceCredit, drillCards } from '../ui.js';

/**
 * #/drills/:slug. Returns null for an unknown slug.
 * `origin` is where the user came from ({href, label}); without one (a deep
 * link or reload) Back goes to the drill's skill.
 */
export function drillView(slug, origin) {
  const d = getDrill(slug);
  if (!d) return null;
  const skill = getSkill(d.group);
  const res = getResource(d.resource);
  const back = origin || { href: `#/skills/${d.group}`, label: skill ? skill.name : 'Drills' };
  const cues = d.cues
    .map((c, i) => `<li class="cue"><span class="cue__n" aria-hidden="true">${i + 1}</span><span>${esc(c)}</span></li>`)
    .join('');
  const more = skill ? skill.drills.filter((k) => k !== slug) : [];
  return {
    title: d.title,
    html: `
      ${backLink(back.href, back.label)}
      ${pageHeader({ title: d.title })}
      ${videoBlock(res, d.title)}
      ${sourceCredit(res)}
      <div class="facts">
        <dl class="facts__row">
          <div><dt>Level</dt><dd>${levelLabel(d.level)}</dd></div>
          ${res && res.length ? `<div><dt>Length</dt><dd>${esc(res.length)}</dd></div>` : ''}
        </dl>
        <hr>
        <dl><dt>You need</dt><dd>${esc(d.needs.join(', '))}</dd></dl>
        <hr>
        <p>Level graded by us, not by the video makers.</p>
      </div>
      <section class="doit" aria-labelledby="doit-h"><h2 id="doit-h">Do it</h2><p>${esc(d.doIt)}</p></section>
      <section class="blk" aria-labelledby="cues-h"><h2 id="cues-h">Coaching cues</h2><ol class="cues">${cues}</ol></section>
      <div class="why">
        <section class="blk" aria-labelledby="why-h"><h2 id="why-h">Why it matters</h2><p>${esc(d.why)}</p></section>
        <section class="blk" aria-labelledby="teaches-h"><h2 id="teaches-h">What it teaches</h2><p>${esc(d.teaches)}</p></section>
      </div>
      ${
        more.length && skill
          ? `<section class="group" aria-labelledby="more-h">
        <h2 class="rule rule--2" id="more-h">More ${esc(skill.name.toLowerCase())} drills</h2>
        ${drillCards(more, { compact: true })}
      </section>`
          : ''
      }`
  };
}
