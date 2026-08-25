/* ───────────────────────────────────────────────────────────────
   Sitehouse — the corner dock
   Injected rather than written into seventeen pages, so the offer can
   change in one file. Skipped on the app shells, on the pages the two
   buttons already lead to, and inside the sign-up flow, where a
   floating "get a free one" undercuts the form someone is filling in.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  var SKIP = ['free', 'extras', 'signup', 'login', 'forgot-email',
              'forgot-password', 'trouble', 'dashboard', 'admin', 'emails'];

  var ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3v4M12 17v4M4.9 7.6l2.8 2.8M16.3 13.6l2.8 2.8M3 12h4M17 12h4M4.9 16.4l2.8-2.8M16.3 10.4l2.8-2.8"/></svg>';

  var ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>';

  function page() {
    var last = global.location.pathname.split('/').pop().replace(/\.html$/, '');
    return last === '' || last === 'index' ? 'home' : last;
  }

  function build() {
    if (doc.body.hasAttribute('data-app')) return;
    if (SKIP.indexOf(page()) > -1) return;
    if (doc.querySelector('.dock')) return;

    var dock = doc.createElement('div');
    dock.className = 'dock';
    dock.setAttribute('data-no-i18n', '');
    // Extras lives in the top bar on every page, so a second button for
    // it down here was two roads to the same place. The free page is the
    // only standing offer that belongs in a corner.
    dock.innerHTML =
      '<a class="dock-btn dock-btn--free" href="free.html">' + ICON_SPARK +
        '<span class="dock-long">Get your free landing page</span>' +
        '<span class="dock-short">Free landing page</span>' +
      '</a>';
    doc.body.appendChild(dock);
  }

  /* The cookie bar is fixed to the bottom at a taller z-index. Watch for
     it rather than guessing: it is injected asynchronously and dismissed
     whenever the visitor gets round to it. */
  function watchCookieBar() {
    function sync() {
      var bar = doc.querySelector('.ck-bar');
      var up = !!(bar && bar.offsetParent !== null);
      doc.body.setAttribute('data-cookiebar', up ? 'up' : 'down');
    }
    sync();
    if (!global.MutationObserver) return;
    new MutationObserver(sync).observe(doc.body, { childList: true, subtree: true });
  }

  function start() { build(); watchCookieBar(); }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
