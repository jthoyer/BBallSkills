/**
 * ui.js: shared render helpers.
 *
 * Every repeated visual pattern lives here exactly once. Views compose these;
 * they do not re-implement them. If you need something nearly like one of
 * these, extend the helper rather than writing a second one.
 */

import { config, getDrill, getResource, getSkill } from './content.js';

/** Escape text for safe interpolation into HTML (also covers attribute values). */
export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only https URLs are ever emitted as external hrefs. Returns '' otherwise. */
export function safeUrl(url) {
  const s = String(url || '').trim();
  return /^https:\/\//i.test(s) ? s : '';
}

/**
 * Page heading. Every view has exactly one, and the router moves focus to it
 * (#page-title) on navigation, so it needs tabindex="-1".
 */
export function pageHeader({ title, lead }) {
  return `
    <header class="page-head">
      <h1 class="page-title" id="page-title" tabindex="-1">${esc(title)}</h1>
      ${lead ? `<p class="page-head__lead">${esc(lead)}</p>` : ''}
    </header>`;
}

/** "<- Label" link back up one level. */
export function backLink(href, label) {
  return `<a class="back" href="${esc(href)}"><span aria-hidden="true">&larr;</span> ${esc(label)}</a>`;
}

/* --- Icons ------------------------------------------------------------------
   Decorative, always aria-hidden, drawn in currentColor. One set: the six
   skills, the chevron, and the two tab icons (which live in index.html). */
const ICON_PATHS = {
  'ball-handling': '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/>',
  shooting: '<ellipse cx="12" cy="6" rx="6" ry="2"/><path d="M6 6l3 12"/><path d="M18 6l-3 12"/><path d="M9 18h6"/>',
  passing: '<path d="M4 8h15"/><path d="M15 4l4 4-4 4"/><path d="M20 16H5"/><path d="M9 12l-4 4 4 4"/>',
  footwork: '<ellipse cx="8.5" cy="15" rx="3" ry="5"/><ellipse cx="16" cy="8.5" rx="3" ry="5"/>',
  defence: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  rebounding: '<circle cx="12" cy="6" r="3"/><path d="M12 21v-9"/><path d="M8 16l4-4 4 4"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>'
};

export function icon(name) {
  const paths = ICON_PATHS[name] || ICON_PATHS['ball-handling'];
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const chevron = () => `<span class="chev" aria-hidden="true">${icon('chevron')}</span>`;

/* --- Level: three bars plus the word. Never colour alone (WCAG 1.4.1). ------- */
const LEVEL_N = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function levelBars(level) {
  const n = LEVEL_N[level] || 0;
  const bars = [1, 2, 3].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('');
  return `<span class="bars" aria-hidden="true">${bars}</span>`;
}

/** Bars + word, e.g. for facts and compact cards. */
export function levelLabel(level) {
  return `<span class="lvl">${levelBars(level)}${esc(level)}</span>`;
}

/* --- Thumbnails ---------------------------------------------------------------
   A resource that is removed, empty or malformed has no usable id: it gets a
   placeholder and makes NO request. */
export function videoId(resource) {
  if (!resource || resource.status === 'removed') return '';
  return /^[A-Za-z0-9_-]{11}$/.test(resource.youtubeId || '') ? resource.youtubeId : '';
}

const thumbUrl = (id) => `https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg`;

/**
 * Card thumbnail. A failed load is swapped for the placeholder by
 * interactions.js (class thumb--none), and the card still links.
 */
function cardThumb(resource, overlay = '') {
  const id = videoId(resource);
  return `<div class="thumb${id ? '' : ' thumb--none'}">${
    id ? `<img class="thumb__img" src="${thumbUrl(id)}" alt="" loading="lazy" width="480" height="360">` : ''
  }${overlay}</div>`;
}

/**
 * Drill card. The whole card is one link to the drill.
 *  - full (default): photo with a pill (bars, level word, length when known),
 *    an icon circle, the title and "Skill . needs".
 *  - compact: small photo, title, and "bars Level . length" for lists inside
 *    a position, a zone card or "More ... drills".
 */
export function drillCard(key, { compact = false } = {}) {
  const d = getDrill(key);
  if (!d) return '';
  const res = getResource(d.resource);
  const skill = getSkill(d.group);
  const length = res && res.length ? res.length : '';
  if (compact) {
    return `
    <li>
      <a class="dcard dcard--row" href="#/drills/${esc(key)}">
        ${cardThumb(res)}
        <span class="dtext">
          <span class="dtitle">${esc(d.title)}</span>
          <span class="dmeta">${levelLabel(d.level)}${length ? ` &middot; ${esc(length)}` : ''}</span>
        </span>
      </a>
    </li>`;
  }
  const pill = `<span class="pill">${levelBars(d.level)}${esc(d.level)}${length ? ` &middot; ${esc(length)}` : ''}</span>`;
  return `
    <li>
      <a class="dcard" href="#/drills/${esc(key)}">
        ${cardThumb(res, pill)}
        <span class="dbody">
          <span class="ico" aria-hidden="true">${icon(d.group)}</span>
          <span class="dtext">
            <span class="dtitle">${esc(d.title)}</span>
            <span class="dmeta">${esc(skill ? skill.name : '')} &middot; ${esc(d.needs.join(', '))}</span>
          </span>
        </span>
      </a>
    </li>`;
}

/** A list of drill cards from drill keys. Keys that do not resolve are skipped. */
export function drillCards(keys, { compact = false } = {}) {
  const cls = compact ? 'list list--tight' : 'list list--cards';
  return `<ul class="${cls}">${keys.map((k) => drillCard(k, { compact })).join('')}</ul>`;
}

/**
 * Schedule card, the whole card one link: optional top meta row (left bold,
 * right muted), a badge (a number or an icon), the name, a count and a chevron.
 */
export function scheduleCard({ href, name, badge, badgeIsIcon, left, right, count }) {
  return `
    <li>
      <a class="sched${left ? '' : ' sched--one'}" href="${esc(href)}">
        ${left ? `<span class="sched__top"><b>${esc(left)}</b> <span>${esc(right)}</span></span>` : ''}
        <span class="sched__main">
          <span class="badge" aria-hidden="true">${badgeIsIcon ? badge : esc(badge)}</span>
          <span class="sched__name">${esc(name)}</span>
          <span class="sched__right">${esc(count)}</span>
          ${chevron()}
        </span>
      </a>
    </li>`;
}

/** The six skills as single-row schedule cards linking to the Find view for that skill. */
export function skillLinks(skillList) {
  return `<ul class="list list--tight">${skillList
    .map((s) =>
      scheduleCard({
        href: `#/skills/${s.slug}`,
        name: s.name,
        badge: icon(s.slug),
        badgeIsIcon: true,
        count: `${s.drills.length} drills`
      })
    )
    .join('')}</ul>`;
}

/**
 * Suggest-a-drill control.
 *  - config.suggestFormUrl is an https URL: an external link, rel="noopener".
 *  - Otherwise: a button. It never renders an <a> with an empty or "#" href.
 *    Pressing it reveals text on how to suggest a drill instead (see
 *    interactions.js). No re-render, so focus stays on the button.
 */
export function suggestControl() {
  const url = safeUrl(config.suggestFormUrl);
  if (url) {
    return `
      <div class="suggest">
        <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Suggest a drill
          <span aria-hidden="true">&nearr;</span><span class="visually-hidden"> (opens in a new tab)</span></a>
      </div>`;
  }
  return `
    <div class="suggest">
      <button class="btn" type="button" data-action="suggest" aria-expanded="false" aria-controls="suggest-note">Suggest a drill</button>
      <div class="note" id="suggest-note" hidden>
        <p>The suggestion form is not open yet. For now, ask your coach or team manager to pass on:</p>
        <ul class="bullets">
          <li>the YouTube link,</li>
          <li>which skill group it fits, and</li>
          <li>why it helps.</li>
        </ul>
        <p>Please do not include any child's name or personal details.</p>
      </div>
    </div>`;
}

/**
 * Click-to-load video. Before a tap: a thumbnail from i.ytimg.com (lazy) and a
 * play button, and nothing else. No iframe, no request to YouTube's player
 * host, so pages stay light on poor signal. Tapping swaps in one
 * youtube-nocookie.com iframe (see interactions.js, which builds it from
 * data-yt and data-title).
 *
 * A thumbnail that fails to load is NOT a removed video: interactions.js
 * swaps in a placeholder and play still works. Only status 'removed', an
 * empty youtubeId or a malformed one shows "Video no longer available".
 */
export function videoBlock(resource, label) {
  const id = videoId(resource);
  if (!id) {
    return `
      <div class="video video--gone">
        <p class="video__gone">Video no longer available</p>
      </div>`;
  }
  return `
    <div class="video" data-video>
      <img class="video__thumb" src="${thumbUrl(id)}" alt="" loading="lazy" width="480" height="360">
      <button class="video__play" type="button" data-action="play" data-yt="${esc(id)}" data-title="${esc(label)}"
        aria-label="Play video: ${esc(label)}">
        <span class="video__icon" aria-hidden="true"></span>
        <span class="video__label" aria-hidden="true">Play video</span>
      </button>
    </div>`;
}

/** "Video by <channel link>" credit. The length is shown in the facts card, not here. */
export function sourceCredit(resource) {
  if (!resource) return '';
  const url = safeUrl(resource.channel && resource.channel.url);
  const name = esc(resource.channel && resource.channel.name);
  const channel = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${name}<span class="visually-hidden"> (YouTube channel, opens in a new tab)</span></a>` : name;
  return `<p class="credit">Video: &ldquo;${esc(resource.title)}&rdquo; by ${channel} on YouTube.</p>`;
}
