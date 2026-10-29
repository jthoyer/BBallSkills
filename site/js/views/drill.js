import { getDrill, getResource, getSkill } from '../content.js';
import { esc, pageHeader, backLink, levelBadge, videoBlock, sourceCredit } from '../ui.js';

/** #/drills/:slug. Returns null for an unknown slug. */
export function drillView(slug) {
  const d = getDrill(slug);
  if (!d) return null;
  const skill = getSkill(d.group);
  const res = getResource(d.resource);
  const cues = d.cues
    .map((c, i) => `<li class="cue"><span class="cue__n" aria-hidden="true">${i + 1}</span>${esc(c)}</li>`)
    .join('');
  return {
    title: d.title,
    html: `
      ${backLink(`#/skills/${d.group}`, skill ? skill.name : 'Skills')}
      ${videoBlock(res, d.title)}
      ${pageHeader({ title: d.title })}
      <p class="level-line">${levelBadge(d.level)} <span class="graded">Graded by us</span></p>
      <section class="blk" aria-labelledby="why-h"><h2 id="why-h">Why it matters</h2><p>${esc(d.why)}</p></section>
      <section class="blk" aria-labelledby="teaches-h"><h2 id="teaches-h">What it teaches</h2><p>${esc(d.teaches)}</p></section>
      <section class="blk" aria-labelledby="cues-h"><h2 id="cues-h">Coaching cues</h2><ol class="cues">${cues}</ol></section>
      <section class="doit" aria-labelledby="doit-h"><h2 id="doit-h">Do it</h2><p>${esc(d.doIt)}</p></section>
      <section class="blk" aria-labelledby="needs-h"><h2 id="needs-h">Needs</h2><p>${esc(d.needs.join(', '))}</p></section>
      ${sourceCredit(res)}`
  };
}
