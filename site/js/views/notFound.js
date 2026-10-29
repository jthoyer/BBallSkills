import { esc, pageHeader } from '../ui.js';

export function notFoundView(rawHash) {
  return {
    title: 'Page not found',
    html: `
      ${pageHeader({ title: 'Page not found', lead: 'That page does not exist. The link may be out of date.' })}
      ${rawHash ? `<p class="note">Requested address: <code>${esc(rawHash)}</code></p>` : ''}
      <p><a class="btn" href="#/">Go to Skills</a></p>`
  };
}
