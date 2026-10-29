/**
 * app.js: bootstrap. Wires the DOM shell in index.html to the router.
 * No build step: loaded directly as <script type="module">.
 */

import { startRouter } from './router.js';
import { bindInteractions } from './interactions.js';

const outlet = document.getElementById('view');
const tabs = document.querySelectorAll('[data-tab]');
const skipLink = document.querySelector('.skip-link');

if (!outlet) {
  throw new Error('app.js: missing #view outlet in index.html');
}

// The skip link would rewrite location.hash to "#view" and the router would
// treat that as an unknown route. Intercept it: focus <main> and leave the hash alone.
if (skipLink) {
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo(0, 0);
    outlet.focus();
  });
}

bindInteractions(outlet);
startRouter({ outlet, tabs });
