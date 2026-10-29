/**
 * interactions.js: the one place that binds behaviour for content the router
 * paints. The router replaces #view's children on every navigation, which
 * destroys any listener attached to them. So every listener here is bound
 * ONCE on the outlet itself and dispatches on data-action.
 *
 * None of these actions repaint a whole view or touch the hash, so focus stays
 * on the control the user pressed.
 */

import { groupList, filterStatus } from './views/skills.js';

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

function setFilter(button) {
  const group = button.closest('.filter');
  const list = document.getElementById('drill-list');
  if (!group || !list) return;
  const level = button.dataset.level;
  group.querySelectorAll('[data-action="filter"]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b === button));
  });
  list.innerHTML = groupList(group.dataset.group, level);
  announce(filterStatus(group.dataset.group, level));
}

function toggleSuggest(button) {
  const note = document.getElementById(button.getAttribute('aria-controls'));
  if (!note) return;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  note.hidden = !open;
}

export function bindInteractions(outlet) {
  outlet.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || !outlet.contains(button)) return;
    switch (button.dataset.action) {
      case 'play': playVideo(button); break;
      case 'filter': setFilter(button); break;
      case 'suggest': toggleSuggest(button); break;
      default: break;
    }
  });

  // <img> error events do not bubble, so listen in the capture phase. A
  // thumbnail that fails (blocked, offline, poor signal) becomes a placeholder.
  // It is NOT treated as a removed video: play still works.
  outlet.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.classList.contains('video__thumb')) return;
      const box = img.closest('[data-video]');
      if (box) box.classList.add('video--nothumb');
      img.remove();
    },
    true
  );
}
