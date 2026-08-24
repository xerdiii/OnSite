/* ───────────────────────────────────────────────────────────────
   Onsite — the site menu
   The bar carries the mark and one control. Everything else lives in a
   panel behind it: the sections, the account link, the theme switch and
   the language and currency pickers.

   Standard dialog manners — focus moves in, Escape and the scrim close
   it, the page behind cannot scroll, and focus returns to the button
   that opened it.

   Two things here are defensive, and both were real bugs on iOS.

   Closing used to wait for `transitionend` before setting hidden. When
   that event does not arrive — Safari drops it if the transition is
   interrupted, or if the panel is off-screen when the class changes —
   the menu stayed hidden=false. A full-screen fixed overlay with an
   invisible scrim then sat on top of the page swallowing every tap, so
   the symptom was "the menu button stopped working" when in fact
   nothing on the page worked. It is a timer now, which always fires.

   Opening used to wait two animation frames. rAF is throttled to zero
   in a backgrounded tab, so the class could never land and the panel
   stayed translated off-screen. A forced reflow replaces it.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var CLOSE_MS = 320;          // must clear the panel transition in hero.css

  function init() {
    var menu = doc.querySelector('[data-menu]');
    var opener = doc.querySelector('[data-menu-open]');
    if (!menu || !opener) return;

    var panel = menu.querySelector('.site-menu-panel');
    var last = null;
    var shutTimer = null;

    function open() {
      global.clearTimeout(shutTimer);
      last = doc.activeElement;
      menu.hidden = false;

      /* Force a layout so the panel has a real starting position, then
         add the class. No frame to wait for, so nothing to starve. */
      void panel.offsetHeight;
      menu.classList.add('is-open');

      doc.body.classList.add('menu-locked');
      opener.setAttribute('aria-expanded', 'true');

      var first = panel.querySelector('a, button');
      if (first) first.focus();
    }

    function close() {
      global.clearTimeout(shutTimer);
      menu.classList.remove('is-open');
      doc.body.classList.remove('menu-locked');
      opener.setAttribute('aria-expanded', 'false');

      /* A timer, not transitionend. If this never ran, the page would be
         covered by an invisible overlay that eats every tap. */
      shutTimer = global.setTimeout(function () { menu.hidden = true; }, CLOSE_MS);

      if (last && last.focus) last.focus();
    }

    opener.addEventListener('click', function (e) {
      e.preventDefault();
      if (menu.hidden) open(); else close();
    });

    [].forEach.call(menu.querySelectorAll('[data-menu-close]'), function (b) {
      b.addEventListener('click', close);
    });

    /* Any destination closes it — including the in-page anchors, which
       would otherwise scroll behind a panel still covering them. The
       language and currency selects must not, so they are excluded. */
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) close();
    });

    /* Coming back via the bfcache restores the DOM exactly as it was,
       including a half-closed menu. Start from shut. */
    global.addEventListener('pageshow', function () {
      global.clearTimeout(shutTimer);
      menu.classList.remove('is-open');
      menu.hidden = true;
      doc.body.classList.remove('menu-locked');
      opener.setAttribute('aria-expanded', 'false');
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
