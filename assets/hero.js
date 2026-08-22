/* ───────────────────────────────────────────────────────────────
   Onsite — the site menu
   The bar carries the mark and one control. Everything else lives in a
   panel behind it: the sections, the account link and the theme switch.

   Standard dialog manners — focus moves in, Escape and the scrim close
   it, the page behind cannot scroll, and focus returns to the button
   that opened it.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  function init() {
    var menu = doc.querySelector('[data-menu]');
    var opener = doc.querySelector('[data-menu-open]');
    if (!menu || !opener) return;

    var panel = menu.querySelector('.site-menu-panel');
    var last = null;

    function open() {
      last = doc.activeElement;
      menu.hidden = false;
      /* One frame before the class, so the panel has a laid-out start
         position to transition from rather than jumping. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
      });
      doc.body.classList.add('menu-locked');
      opener.setAttribute('aria-expanded', 'true');
      var first = panel.querySelector('a, button');
      if (first) first.focus();
    }

    function close() {
      menu.classList.remove('is-open');
      doc.body.classList.remove('menu-locked');
      opener.setAttribute('aria-expanded', 'false');
      var done = function () { menu.hidden = true; panel.removeEventListener('transitionend', done); };
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion:reduce)').matches) done();
      else panel.addEventListener('transitionend', done);
      if (last && last.focus) last.focus();
    }

    opener.addEventListener('click', open);
    [].forEach.call(menu.querySelectorAll('[data-menu-close]'), function (b) {
      b.addEventListener('click', close);
    });
    /* Any destination closes it — including the in-page anchors, which
       would otherwise scroll behind a panel that is still covering them. */
    [].forEach.call(menu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', close);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) close();
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
