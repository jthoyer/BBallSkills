/**
 * ui.js: shared render helpers.
 *
 * Every repeated visual pattern lives here exactly once. Views compose these;
 * they do not re-implement them. If you need something nearly like one of
 * these, extend the helper rather than writing a second one.
 */

import { config, getDrill } from './content.js';

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
export function pageHeader({ title, lead, kicker }) {
  return `
    <header class="page-head">
      ${kicker ? `<p class="page-head__kicker">${esc(kicker)}</p>` : ''}
      <h1 class="page-title" id="page-title" tabindex="-1">${esc(title)}</h1>
      ${lead ? `<p class="page-head__lead">${esc(lead)}</p>` : ''}
    </header>`;
}

/** "← Label" link back up one level. */
export function backLink(href, label) {
  return `<a class="back" href="${esc(href)}"><span aria-hidden="true">&larr;</span> ${esc(label)}</a>`;
}

/**
 * Level as text plus a three-bar glyph. The word is always present; the bars
 * and the orange outline are extra, never the only signal (WCAG 1.4.1).
 */
export function levelBadge(level) {
  const n = { Beginner: 1, Intermediate: 2, Advanced: 3 }[level] || 0;
  const bars = [1, 2, 3]
    .map((i) => `<i class="level__bar${i <= n ? ' level__bar--on' : ''}"></i>`)
    .join('');
  return `<span class="level"><span class="level__bars" aria-hidden="true">${bars}</span>${esc(level)}</span>`;
}

/** Full-width tappable row. `href` is a hash route. */
export function row({ href, title, number, meta, metaHtml }) {
  return `
    <li class="rows__item">
      <a class="row" href="${esc(href)}">
        ${number ? `<span class="row__num" aria-hidden="true">${esc(number)}</span>` : ''}
        <span class="row__body">
          <span class="row__title">${esc(title)}</span>
          ${metaHtml ? `<span class="row__meta">${metaHtml}</span>` : meta ? `<span class="row__meta">${esc(meta)}</span>` : ''}
        </span>
        <span class="row__chev" aria-hidden="true">&rsaquo;</span>
      </a>
    </li>`;
}

/** List of drill rows from drill keys. Keys that do not resolve are skipped. */
export function drillRows(keys, className = 'rows') {
  const items = keys
    .map((k) => ({ k, d: getDrill(k) }))
    .filter((x) => x.d)
    .map(({ k, d }) => row({ href: `#/drills/${k}`, title: d.title, metaHtml: levelBadge(d.level) }))
    .join('');
  return `<ul class="${esc(className)}">${items}</ul>`;
}

/** Links to all six skill groups. */
export function skillLinks(skillList) {
  return `<ul class="rows">${skillList
    .map((s, i) =>
      row({
        href: `#/skills/${s.slug}`,
        title: s.name,
        number: String(i + 1).padStart(2, '0'),
        meta: `${s.drills.length} drills`
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
 * swaps in a placeholder and play still works. Only status 'removed' or an
 * empty youtubeId shows "Video no longer available".
 */
export function videoBlock(resource, label) {
  if (!resource || resource.status === 'removed' || !resource.youtubeId) {
    return `
      <div class="video video--gone">
        <p class="video__gone">Video no longer available</p>
      </div>`;
  }
  const id = resource.youtubeId;
  return `
    <div class="video" data-video>
      <img class="video__thumb" src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
      <button class="video__play" type="button" data-action="play" data-yt="${esc(id)}" data-title="${esc(label)}"
        aria-label="Play video: ${esc(label)}">
        <span class="video__icon" aria-hidden="true"></span>
        <span class="video__label" aria-hidden="true">Play video</span>
      </button>
    </div>`;
}

/** "Video by <channel link>" credit plus length when known. */
export function sourceCredit(resource) {
  if (!resource) return '';
  const url = safeUrl(resource.channel && resource.channel.url);
  const name = esc(resource.channel && resource.channel.name);
  const channel = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${name}<span class="visually-hidden"> (YouTube channel, opens in a new tab)</span></a>` : name;
  return `<p class="credit">Video: &ldquo;${esc(resource.title)}&rdquo; by ${channel} on YouTube.${
    resource.length ? ` Length: ${esc(resource.length)}.` : ''
  }</p>`;
}
