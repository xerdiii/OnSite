/* ───────────────────────────────────────────────────────────────
   Xovah — menu type that reassembles itself

   Touch a menu item and its letters break into symbols for a moment,
   then lock back into the word, left to right. Each letter is its own
   animation with its own moment of resolving, which is what makes it
   read as type reassembling rather than a word being swapped.

   Rules it keeps:
     · one pass per hover — it never loops while the pointer sits there
     · the real word is always what is left on screen at the end
     · under 300ms for a normal menu item
     · spaces, punctuation and accents are left alone; only letters and
       digits scramble, so the shape of the word survives
     · the accessible name is pinned to the real word before the first
       symbol appears, so a screen reader never reads the noise
     · prefers-reduced-motion gets nothing at all

   Menus built later by other files are covered too: the hover is read
   from the document, not bound to the elements at load.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var SELECTOR = '.site-menu-links a, .m-drawer-link, .site-menu-cta, .m-drawer-cta, .fp-nav-link, .fp-nav-cta';
  var CHARS = '@#$%&*()!?+=^/\\';

  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce && reduce.matches) return;
  if (!global.requestAnimationFrame) return;

  var HOLD = 70;   /* how long the first letter stays broken */
  var STEP = 20;   /* the gap between one letter locking and the next */
  var TICK = 36;   /* how often a broken letter picks a new symbol */

  /* A symbol per letter per tick, from the letter's own position rather
     than Math.random, so the same letter does not flicker twice to the
     same character within one frame. */
  function symbol(i, tick) {
    var n = (i * 37 + tick * 101 + ((i * tick) % 13)) % CHARS.length;
    return CHARS.charAt(n);
  }

  function run(el) {
    if (el.__scrambling) return;

    var text = el.textContent;
    var letters = text.split('');
    var last = 0;
    for (var i = 0; i < letters.length; i++) {
      if (/[A-Za-z0-9]/.test(letters[i])) last = i;
    }
    var ends = HOLD + last * STEP + TICK;
    if (!text.trim()) return;

    /* The word is the label from here until it is back on screen. */
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text.trim());
    el.__scrambling = true;

    var started = 0;

    /* requestAnimationFrame stops in a backgrounded tab. If that happens
       mid-word, this puts the real text back rather than leaving symbols
       sitting there until the tab is looked at again. */
    var safety = global.setTimeout(function () {
      el.textContent = text;
      el.__scrambling = false;
    }, ends + 400);

    function frame(now) {
      if (!started) started = now;
      var t = now - started;
      var tick = Math.floor(t / TICK);

      var out = '';
      for (var i = 0; i < letters.length; i++) {
        var ch = letters[i];
        if (!/[A-Za-z0-9]/.test(ch) || t >= HOLD + i * STEP) out += ch;
        else out += symbol(i, tick);
      }
      el.textContent = out;

      if (t < ends) {
        global.requestAnimationFrame(frame);
      } else {
        global.clearTimeout(safety);
        el.textContent = text;
        el.__scrambling = false;
      }
    }

    global.requestAnimationFrame(frame);
  }

  /* pointerover rather than pointerenter: the menus are built after this
     file runs, and moving between two items has to fire twice. The
     relatedTarget check keeps a move inside one item from restarting it. */
  /* A menu opening sweeps its own links under a stationary cursor, which
     would scramble a word nobody hovered. Nothing runs while a menu is
     still arriving. */
  var menuMovedAt = 0;
  doc.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-menu-open], .m-nav-toggle, [data-menu-close], .m-drawer-close')) {
      menuMovedAt = Date.now();
    }
  }, true);

  doc.addEventListener('pointerover', function (e) {
    var el = e.target.closest && e.target.closest(SELECTOR);
    if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    if (Date.now() - menuMovedAt < 1000) return;
    run(el);
  });

  doc.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest(SELECTOR);
    if (el) run(el);
  });
})(window);
