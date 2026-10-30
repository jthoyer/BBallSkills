/**
 * interactions.js: the one place that binds behaviour for content the router
 * paints. The router replaces #view's children on every navigation, which
 * destroys any listener attached to them. So every listener here is bound
 * ONCE, high up, and dispatches on data-action. Clicks are caught on the
 * document because the footer's Suggest button lives outside #view.
 *
 * None of these actions repaint a whole view or touch the hash. A select
 * change repaints only the result line, summary row and list, so focus stays
 * on the select.
 */

import { paintFind, setFilter, clearFilters, syncSelects, findAnnouncement } from './views/skills.js';

/** Screen-reader announcement via the live region in index.html (outside #view). */
function announce(message) {
  const el = document.getElementById('status');
  if (el) el.textContent = message;
}

function playVideo(button) {
  const box = button.closest('[data-video]');
  if (!box) return;
  const iframe = document.createElement('iframe');
  iframe.className = 'video__frame';
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(button.dataset.yt)}?rel=0&autoplay=1&playsinline=1`;
  iframe.title = `${button.dataset.title} (video)`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.setAttribute('allowfullscreen', '');
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  box.replaceChildren(iframe);
  box.classList.add('video--playing');
  // The button that had focus is gone: hand focus to the player so keyboard
  // users are not dropped back to the top of the page.
  iframe.focus();
}

/** A select changed: store the value, repaint the list only, announce once. */
function onFilterChange(select) {
  setFilter(select.dataset.filter, select.value);
  if (select.value) select.setAttribute('data-active', 'true');
  else select.removeAttribute('data-active');
  paintFind();
  announce(findAnnouncement());
}

/** Clear all / Show all drills: reset all three, then put focus on the Skill select. */
function clearAll() {
  clearFilters();
  syncSelects();
  paintFind();
  announce(findAnnouncement('Filters cleared. '));
  const skill = document.getElementById('f-skill');
  if (skill) skill.focus();
}

function toggleSuggest(button) {
  const note = document.getElementById(button.getAttribute('aria-controls'));
  if (!note) return;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  note.hidden = !open;
}

export function bindInteractions(outlet) {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    switch (button.dataset.action) {
      case 'play': playVideo(button); break;
      case 'clear': clearAll(); break;
      case 'suggest': toggleSuggest(button); break;
      default: break;
    }
  });

  outlet.addEventListener('change', (event) => {
    const select = event.target.closest('select[data-filter]');
    if (select) onFilterChange(select);
  });

  // <img> error events do not bubble, so listen in the capture phase. A
  // thumbnail that fails (blocked, offline, poor signal) becomes a placeholder.
  // It is NOT treated as a removed video: play still works, and a card still links.
  outlet.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.classList.contains('video__thumb')) {
        const box = img.closest('[data-video]');
        if (box) box.classList.add('video--nothumb');
        img.remove();
      } else if (img.classList.contains('thumb__img')) {
        const box = img.closest('.thumb');
        if (box) box.classList.add('thumb--none');
        img.remove();
      }
    },
    true
  );
}
