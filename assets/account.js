/* ───────────────────────────────────────────────────────────────
   Xovah — account page motion

   Two jobs, and nothing else:

     · an entrance, once, on load — the card settles, then its
       contents resolve in reading order
     · a step change, whenever a panel is swapped, so moving from
       "email" to "password" reads as one screen advancing rather
       than as the page being replaced

   Rules it keeps to:

     · prefers-reduced-motion is honoured, and honoured properly —
       no motion at all, not merely faster motion
     · nothing here can leave content invisible. Every element is
       animated with fill:'both' from opacity 0, so a browser that
       cancels or never starts the animation still paints the final
       frame; and the pre-paint guard has its own timer
     · it runs after the session check has decided whether this page
       is even needed, so the entrance is never played to somebody
       who is about to be redirected to their dashboard
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !!(global.Element && Element.prototype.animate) && !reduced;

  /* Hide what we are about to animate — but only when we are
     actually going to animate it, and only from script, so a page
     with JavaScript off is never left blank by a stylesheet waiting
     for a class that will never arrive. */
  if (canAnimate) doc.documentElement.classList.add('acct-motion');

  var EASE = 'cubic-bezier(.16,1,.3,1)';     // a long, soft settle
  var SOFT = 'cubic-bezier(.22,1,.36,1)';

  /* The order things resolve in. Anything not on the list is simply
     not animated, which is the safe default for markup added later. */
  var SEQUENCE = [
    '.acct-h',
    '.acct-sub',
    '.acct-who',
    '.acct-btn--ghost',
    '.acct-or',
    '.acct-field',
    '.acct-check',
    '.acct-btn:not(.acct-btn--ghost)',
    '.acct-note',
    '.acct-links',
    '.acct-alt',
    '.ob-packs .ob-pack',
    '.tr-actions',
    '.tr-group',
    '.tr-q'
  ];

  function inOrder(root) {
    var seen = [];
    SEQUENCE.forEach(function (sel) {
      var found = root.querySelectorAll(sel);
      for (var i = 0; i < found.length; i++) {
        if (seen.indexOf(found[i]) < 0) seen.push(found[i]);
      }
    });
    /* Back into document order: the selector list is a filter, not a
       running order. Reading order is the running order. */
    return seen.sort(function (a, b) {
      var pos = a.compareDocumentPosition(b);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });
  }

  function play(el, delay, dur, easing, from) {
    var to = { opacity: 1, transform: 'none' };
    var start = { opacity: 0 };
    for (var k in from) if (Object.prototype.hasOwnProperty.call(from, k)) start[k] = from[k];
    return el.animate([start, to], { delay: delay, duration: dur, easing: easing, fill: 'both' });
  }

  /* ── The entrance ────────────────────────────────────────────
     The card arrives first and alone; everything inside it follows
     on a stagger that tightens as it goes, so the last few items do
     not feel like waiting. */
  function entrance() {
    var card = doc.querySelector('.acct-card');
    var top = doc.querySelector('.acct-top');
    var foot = doc.querySelector('.acct-foot');
    if (!card) return;

    if (!canAnimate) { reveal(); return; }

    /* Nobody is looking, and the timeline is stopped anyway. Show the
       finished page; an entrance played to an empty room is just a
       page that was blank when they arrived. */
    if (doc.visibilityState === 'hidden') { reveal(); return; }

    var running = live;

    if (top) running.push(play(top, 0, 520, SOFT, { transform: 'translateY(-6px)' }));
    running.push(play(card, 40, 760, EASE, { transform: 'translateY(14px) scale(.985)' }));

    var panel = card.querySelector('[data-panel].is-on') || card;
    var items = inOrder(panel);

    var t = 200;
    items.forEach(function (el, i) {
      // 60ms apart at the top, easing down to 26ms by the tenth item.
      var gap = Math.max(26, 60 - i * 4);
      running.push(play(el, t, 520, SOFT, { transform: 'translateY(9px)' }));
      t += gap;
    });

    if (foot) running.push(play(foot, t + 60, 460, SOFT, { transform: 'translateY(6px)' }));

    /* Hand the elements back to the stylesheet once they have landed,
       so nothing carries a fill-forward animation for the rest of the
       session — a lingering fill:'both' beats any later class change. */
    var left = running.length;
    running.forEach(function (a) {
      var done = function () { if (--left === 0) reveal(); };
      if (a.finished && a.finished.then) a.finished.then(done, done);
      else done();
    });

    /* Whatever happens above, the page is readable shortly after the
       last animation was due to end. reveal() cancels, so this works
       even when the timeline never moved. */
    global.setTimeout(reveal, t + 900);

    /* And if the tab is hidden mid-entrance, finish immediately on the
       way back rather than resuming a stale sequence. */
    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'hidden') reveal();
    }, { once: true });
  }

  /* Everything currently animating, so the failsafe can call the
     whole thing off rather than hope it finishes. */
  var live = [];

  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    /* Cancel first. An unfinished fill:'both' animation beats the
       stylesheet, so adding the class without this leaves the page
       blank — which is precisely what happens in a background tab. */
    for (var i = 0; i < live.length; i++) {
      try { live[i].cancel(); } catch (e) {}
    }
    live.length = 0;
    doc.documentElement.classList.add('acct-shown');
  }

  /* ── Step to step ────────────────────────────────────────────
     Called by the pages when they swap panels. The outgoing panel is
     not animated out — it is replaced — because a cross-fade between
     two forms of different heights makes the card jump. */
  function step(panel, back) {
    if (!panel) return;
    if (!canAnimate || doc.visibilityState === 'hidden') return;

    var dir = back ? -14 : 14;
    var these = [play(panel, 0, 420, EASE, { transform: 'translateX(' + dir + 'px)' })];

    var items = inOrder(panel);
    var t = 60;
    items.forEach(function (el, i) {
      these.push(play(el, t, 380, SOFT, { transform: 'translateY(7px)' }));
      t += Math.max(20, 42 - i * 3);
    });

    /* Same rule as the entrance: an animation that stalls must not be
       allowed to hold a form invisible. */
    function drop() {
      for (var i = 0; i < these.length; i++) { try { these[i].cancel(); } catch (e) {} }
      these.length = 0;
    }
    global.setTimeout(drop, t + 700);
    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'hidden') drop();
    }, { once: true });
  }

  /* ── The falcon ──────────────────────────────────────────────
     Decorative, and 2MB of it, so: only started when the panel is
     actually on screen (it is display:none below 1024px, and a
     display:none video still downloads if you ask it to play), only
     faded in once there are frames to show, and never allowed to
     throw — autoplay is refused often enough that an unhandled
     rejection here would be a console error on a login page. */
  function falcon() {
    var v = doc.querySelector('.acct-photo-v');
    if (!v) return;
    if (reduced) return;

    var panel = v.closest('.acct-photo');
    if (!panel || global.getComputedStyle(panel).display === 'none') return;

    v.addEventListener('canplay', function () { v.classList.add('is-ready'); }, { once: true });
    if (v.readyState >= 2) v.classList.add('is-ready');

    v.preload = 'auto';
    var p = v.play();
    if (p && p['catch']) p['catch'](function () {
      /* Autoplay refused. The poster is already there and is a
         perfectly good still, so there is nothing to recover from. */
      v.classList.add('is-ready');
    });
  }

  /* ── Start, without waiting for anything ─────────────────────
     This used to be called by each page once its session check came
     back. That check goes over the network, so the page stayed
     invisible for as long as the CDN took to answer — which on a bad
     connection is for ever. Motion belongs to the document, not to
     the auth service.

     Somebody who IS signed in still does not see the form: the
     pre-paint probe in each page's head hides the whole main when a
     token is present, and that is a synchronous localStorage read. */
  function begin() { entrance(); falcon(); }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }

  /* The panel appears when a window is widened past 1024px. */
  if (global.matchMedia) {
    var wide = global.matchMedia('(min-width: 1024px)');
    var onWide = function (e) { if (e.matches) falcon(); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  global.SitehouseAccountMotion = {
    enter: entrance,
    step: step,
    reveal: reveal,
    reduced: reduced
  };

  /* Belt and braces. Nothing should reach this now that entrance()
     runs on DOM ready, but a page must never be able to stay hidden. */
  global.setTimeout(reveal, 1500);
})(window);
