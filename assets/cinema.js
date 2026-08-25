/* ───────────────────────────────────────────────────────────────
   Sitehouse — the editorial layer's behaviour

   Two jobs: reveal things as they arrive, and count the key figures
   up once when you reach them.

   Both are progressive. The .rise class is added by this file, not by
   the markup, so with JavaScript off nothing is ever hidden — the page
   renders finished. Counters read their target from the text already
   in the element, so the real number is in the HTML for a crawler and
   for anyone whose script never loads.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var reduced = global.matchMedia &&
                global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal() {
    var targets = doc.querySelectorAll('[data-rise]');
    if (!targets.length) return;

    if (reduced || !('IntersectionObserver' in global)) {
      [].forEach.call(targets, function (t) { t.classList.add('rise', 'is-in'); });
      return;
    }

    [].forEach.call(targets, function (t) { t.classList.add('rise'); });

    function showAll() {
      [].forEach.call(targets, function (t) { t.classList.add('is-in'); });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);        // once is enough; this is arrival, not a toggle
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

    [].forEach.call(targets, function (t) { io.observe(t); });

    // A dead man's switch. These elements start at opacity 0, so if the
    // observer never delivers — a background tab that never composites,
    // a browser quirk, anything — nine headings stay invisible and the
    // page is broken. Two seconds later they are shown regardless;
    // anything already revealed by then is unaffected.
    global.setTimeout(showAll, 2000);
    global.addEventListener('pageshow', showAll);
  }

  function count(el) {
    var raw = el.textContent.trim();
    var target = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (isNaN(target)) return;

    var suffix = raw.replace(/[\d.,\s]/g, '');   // the "%" or "+" if there is one
    var dur = 1100;
    var t0 = null;

    function frame(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      // Fast out of the gate, settling at the end — a number that eases
      // in from zero reads as slow before it reads as anything.
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) global.requestAnimationFrame(frame);
      else el.textContent = raw;                 // land on exactly what the HTML said
    }
    global.requestAnimationFrame(frame);
  }

  function figures() {
    var nums = doc.querySelectorAll('[data-count]');
    if (!nums.length || reduced || !('IntersectionObserver' in global)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        count(e.target);
      });
    }, { threshold: 0.6 });

    [].forEach.call(nums, function (n) { io.observe(n); });
  }

  function start() { reveal(); figures(); }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
