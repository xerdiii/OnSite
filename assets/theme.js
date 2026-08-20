/* ───────────────────────────────────────────────────────────────
   Onsite — theme switch
   The stored choice is applied by a tiny inline snippet in <head>
   before paint; this file only builds the control and handles the
   click. No choice stored means "follow the system".
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var KEY = 'onsite.theme';

  var SUN = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M5.6 5.6 7.2 7.2M16.8 16.8l1.6 1.6M18.4 5.6 16.8 7.2M7.2 16.8l-1.6 1.6"/></svg>';
  var MOON = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"/></svg>';

  function current() {
    var set = doc.documentElement.getAttribute('data-theme');
    if (set) return set;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    doc.documentElement.setAttribute('data-theme', theme);
    try { global.localStorage.setItem(KEY, theme); } catch (e) { /* private mode */ }
    [].forEach.call(doc.querySelectorAll('.theme-toggle'), function (b) {
      b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      b.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });
  }

  function button(withLabel) {
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = 'theme-toggle';
    b.innerHTML = SUN + MOON + (withLabel ? '<span>Theme</span>' : '');
    b.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
    return b;
  }

  function mount() {
    // Public pages: next to the nav links. App shells: in the top bar.
    var nav = doc.querySelector('header nav') || doc.querySelector('header > div');
    if (nav && !nav.querySelector('.theme-toggle')) {
      var cluster = nav.querySelector('div.flex.items-center:last-child');
      var btn = button(false);
      // Last in the cluster, but never past the menu button — the menu stays
      // the outermost control. App shells have no menu button of ours and
      // keep the toggle where it always was.
      if (cluster) {
        var menu = cluster.querySelector('.m-nav-toggle');
        var before = menu || (doc.body.hasAttribute('data-app') ? cluster.firstChild : null);
        cluster.insertBefore(btn, before);
      }
      else {
        // No cluster to join (the sign-in and app headers): still keep the
        // menu button outermost.
        nav.insertBefore(btn, nav.querySelector('.m-nav-toggle'));
      }
    }

    // Mobile drawer gets a labelled version
    var body = doc.querySelector('.m-drawer-body');
    if (body && !body.querySelector('.theme-toggle')) { body.appendChild(button(true)); }

    apply(current());
  }

  // The drawer is built by mobile.js, which may run after this file.
  function start() {
    mount();
    global.setTimeout(mount, 0);
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})(window);
