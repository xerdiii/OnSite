/* ───────────────────────────────────────────────────────────────
   Onsite — the industry reel
   Five films, one sticky stage, one scroll. Two behaviours behind one
   bit of markup, chosen by gsap.matchMedia so the switch between them
   cleans up after itself:

     reel   the stage is sticky in CSS, so nothing is pinned by
            JavaScript. ScrollTrigger only reads progress and hands
            one panel over to the next — opacity, scale, a little
            vertical drift, and on a desktop a touch of blur on the
            outgoing frame
     calm   prefers-reduced-motion, or no GSAP at all: the panels
            stack down the page, each one plays when it is on screen
            and nothing is tied to the scroll

   The films are never seeked. Scrubbing currentTime on delivery
   encodes this size is unreliable everywhere and hopeless on iOS, and
   the brief is clear that the picture matters more than the trick —
   so they autoplay muted, loop, and stop when they are off screen.

   Only the chapter you are on and the one after it are ever loaded.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var TR = 0.28;   // handover length, in chapters
  var LEAD = 0.20; // how far before the boundary the count flips

  function list(nodes) { return Array.prototype.slice.call(nodes); }

  function init() {
    var reel = doc.querySelector('[data-reel]');
    if (!reel) return;

    var panels = list(reel.querySelectorAll('[data-reel-panel]'));
    if (!panels.length) return;

    var videos = panels.map(function (p) { return p.querySelector('video'); });
    var texts  = panels.map(function (p) { return p.querySelector('[data-reel-text]'); });
    var ticks  = list(reel.querySelectorAll('[data-reel-tick]'));
    var count  = reel.querySelector('[data-reel-count]');

    var near = false;   // section is on screen, or nearly
    var idle = null;    // timer that stops the outgoing film

    // ── the films ──────────────────────────────────────────────
    // Setting src is enough to start the load; calling load() as well
    // cancels any play() issued in the same tick.
    function load(i) {
      var v = videos[i];
      if (!v || v.getAttribute('src')) return;
      v.setAttribute('src', v.getAttribute('data-src'));
    }

    // The chapter after this one gets its header and first frames, and
    // nothing more — a few hundred kilobytes against a file that can run
    // to eighty megabytes.
    function prime(i) {
      var v = videos[i];
      if (!v || v.getAttribute('src')) return;
      v.setAttribute('preload', 'metadata');
      load(i);
    }

    function play(i) {
      var v = videos[i];
      if (!v) return;
      load(i);
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        // A play() that lands before there are frames is rejected. Try
        // again once there are; a refused autoplay just leaves the poster.
        v.addEventListener('canplay', function () {
          var q = v.play();
          if (q && q.catch) q.catch(function () {});
        }, { once: true });
      });
    }

    function stopAllBut(i) {
      videos.forEach(function (v, j) { if (v && j !== i) v.pause(); });
    }

    function pauseAll() {
      global.clearTimeout(idle);
      videos.forEach(function (v) { if (v) v.pause(); });
    }

    // ── the count ──────────────────────────────────────────────
    var shown = -1;
    function mark(i) {
      if (i === shown) return;
      shown = i;
      ticks.forEach(function (t, j) {
        if (j === i) t.setAttribute('data-on', '');
        else t.removeAttribute('data-on');
      });
      if (count) count.textContent = ('0' + (i + 1)).slice(-2) + ' / 05';
    }

    // ── which chapter are we on ────────────────────────────────
    var at = -1;
    function chapter(i) {
      if (i === at) return;
      at = i;
      mark(i);
      if (!near) return;

      load(i);
      prime(i + 1); // the next one, warmed but not buffered
      play(i);

      // Let the outgoing film keep running until it has faded out,
      // rather than freezing a frame that is still half on screen.
      global.clearTimeout(idle);
      idle = global.setTimeout(function () { stopAllBut(at); }, 900);
    }

    // ── on screen or not ───────────────────────────────────────
    function watch() {
      if (!('IntersectionObserver' in global)) {
        near = true;
        chapterRefresh();
        return function () {};
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          near = e.isIntersecting;
          if (near) chapterRefresh();
          else pauseAll();
        });
      }, { rootMargin: '50% 0px' });
      io.observe(reel);
      return function () { io.disconnect(); };
    }

    function chapterRefresh() {
      var i = at;
      at = -1;
      chapter(i < 0 ? 0 : i);
    }

    // Whichever mode is running says how to pick the films back up when
    // the tab comes forward again.
    var resume = null;
    function onHidden() { if (doc.hidden) pauseAll(); else if (resume) resume(); }
    doc.addEventListener('visibilitychange', onHidden);

    mark(0);

    // ── no GSAP, or reduced motion: stack them and let each one
    //    play in place. Nothing watches the section as a whole here —
    //    each panel answers for itself. ─────────────────────────
    function calm() {
      reel.classList.add('reel--calm');
      mark(0);

      if (!('IntersectionObserver' in global)) {
        panels.forEach(function (p, i) { play(i); });
        return function () { resume = null; pauseAll(); };
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var i = panels.indexOf(e.target);
          if (i < 0) return;
          if (e.intersectionRatio >= 0.35) { load(i); play(i); mark(i); }
          else if (videos[i]) videos[i].pause();
        });
      }, { threshold: [0, 0.35, 0.7] });

      function observe() { panels.forEach(function (p) { io.observe(p); }); }
      observe();
      // Re-observing reports straight away, which is all the resume needs.
      resume = function () { io.disconnect(); observe(); };

      return function () { resume = null; io.disconnect(); pauseAll(); };
    }

    if (!global.gsap || !global.ScrollTrigger) {
      var offCalm = calm();
      global.addEventListener('pagehide', function () {
        offCalm(); doc.removeEventListener('visibilitychange', onHidden);
      }, { once: true });
      return;
    }

    var gsap = global.gsap;
    gsap.registerPlugin(global.ScrollTrigger);

    // ── the reel ───────────────────────────────────────────────
    function reelMode(soft) {
      reel.classList.remove('reel--calm');
      var unwatch = watch();
      resume = function () { if (near && at >= 0) play(at); };

      // Only the frame on its way out softens. The incoming one arrives
      // sharp — two blurred plates at once reads as a focus pull, not a
      // dissolve.
      var out = { autoAlpha: 0, scale: 0.965, yPercent: -1.4, ease: 'power1.inOut', duration: TR };
      if (soft) out.filter = 'blur(5px)';

      var tl = gsap.timeline({
        defaults: { overwrite: 'auto' },
        scrollTrigger: {
          trigger: reel,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            var i = Math.floor(self.progress * panels.length + LEAD);
            chapter(i < 0 ? 0 : (i > panels.length - 1 ? panels.length - 1 : i));
          }
        }
      });

      gsap.set(panels[0], { autoAlpha: 1, scale: 1, yPercent: 0, filter: 'blur(0px)' });
      gsap.set(panels.slice(1), { autoAlpha: 0 });

      panels.forEach(function (panel, i) {
        var start = i - TR;

        if (i > 0) {
          tl.fromTo(panel,
            { autoAlpha: 0, scale: 1.06, yPercent: 1.4, filter: 'blur(0px)' },
            { autoAlpha: 1, scale: 1, yPercent: 0, filter: 'blur(0px)', ease: 'power1.inOut', duration: TR },
            start);
          tl.to(panels[i - 1], out, start);
        }

        // The copy leads the picture in and leaves before the handover,
        // so no two headings are ever on screen together.
        var text = texts[i];
        if (!text) return;
        tl.fromTo(text,
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.2 },
          i === 0 ? 0.02 : i - 0.06);
        tl.to(text, { y: -16, ease: 'none', duration: 0.5 }, i + 0.14);
        tl.to(text, { autoAlpha: 0, y: -36, ease: 'power2.in', duration: 0.16 }, i + 0.66);
      });

      return function () {
        resume = null;
        unwatch();
        at = -1;
        pauseAll();
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        gsap.set(panels, { clearProps: 'all' });
        gsap.set(texts.filter(Boolean), { clearProps: 'all' });
      };
    }

    var mm = gsap.matchMedia();

    // Every width has to be covered by a condition — gsap.matchMedia only
    // runs the callback when at least one of them matches. Blur is the one
    // thing a phone should not be asked to do over a full-screen film;
    // everything else is the same everywhere.
    mm.add({
      quiet: '(prefers-reduced-motion: reduce)',
      soft:  '(min-width: 768px)',
      snug:  '(max-width: 767px)'
    }, function (context) {
      var c = context.conditions;
      if (c.quiet) return calm();
      return reelMode(!!c.soft);
    });

    global.addEventListener('pagehide', function () {
      mm.revert();
      doc.removeEventListener('visibilitychange', onHidden);
    }, { once: true });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
