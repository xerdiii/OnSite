/* ───────────────────────────────────────────────────────────────
   Onsite — the espresso section
   Three behaviours behind one bit of markup, chosen by gsap.matchMedia
   so the switch between them cleans up after itself:

     desktop   pin the section and drive video.currentTime from the
               scroll position, with the copy fading in at the top of
               the pin and back out before the release
     phone     no pinning — reveal, autoplay muted on entry, pause on
               exit, because iOS will not scrub reliably and a 4MB
               all-intra file has no business on a phone
     calm      prefers-reduced-motion: the shot plays and nothing is
               tied to the scroll at all

   Without JavaScript, or without GSAP, the poster still renders and
   the copy still reads — nothing here is load-bearing.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  function init() {
    var section = doc.querySelector('[data-cinema]');
    if (!section) return;

    var video = section.querySelector('video');
    var copy = section.querySelector('[data-cinema-copy]');
    if (!video || !copy) return;

    var SRC_WIDE = video.getAttribute('data-src-wide');
    var SRC_TALL = video.getAttribute('data-src-tall');
    var POSTER_WIDE = video.getAttribute('poster');
    var POSTER_TALL = video.getAttribute('data-poster-tall');

    // ── helpers ────────────────────────────────────────────────
    function load(src) {
      if (video.getAttribute('src') === src) return;
      // The two encodes are cropped differently, so the still has to
      // follow the clip or the first paint jumps.
      var poster = src === SRC_TALL ? POSTER_TALL : POSTER_WIDE;
      if (poster) video.setAttribute('poster', poster);
      video.setAttribute('src', src);
      video.load();
    }

    function metadata() {
      return new Promise(function (resolve) {
        if (video.readyState >= 1 && video.duration) return resolve(video.duration);
        var done = function () {
          video.removeEventListener('loadedmetadata', done);
          resolve(video.duration || 0);
        };
        video.addEventListener('loadedmetadata', done);
      });
    }

    function play() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay refused; poster stands in */ });
    }

    // ── no GSAP: a plain looping shot, and nothing else ────────
    if (!global.gsap || !global.ScrollTrigger) {
      load(global.matchMedia('(max-width: 767px)').matches ? SRC_TALL : SRC_WIDE);
      video.loop = true;
      section.setAttribute('data-reveal', 'in');
      play();
      return;
    }

    var gsap = global.gsap;
    gsap.registerPlugin(global.ScrollTrigger);

    // ── desktop: the pour follows the scroll ───────────────────
    function scrub() {
      load(SRC_WIDE);
      video.loop = false;
      video.pause();
      section.setAttribute('data-reveal', 'in');

      var tl = null;
      var cancelled = false;

      metadata().then(function (duration) {
        if (cancelled || !duration) return;

        // Nudge the decoder so the first frame is on screen before the
        // pin engages, rather than a black plate.
        try { video.currentTime = 0.001; } catch (e) { /* not seekable yet */ }

        var head = { t: 0 };
        // Stop a hair short so the last scroll pixel does not fire `ended`
        // and reset the frame to black.
        var last = Math.max(0, duration - 0.04);

        function seek() {
          if (video.readyState < 2) return;
          var t = head.t > last ? last : head.t;
          if (Math.abs(video.currentTime - t) < 0.004) return;
          try { video.currentTime = t; } catch (e) { /* mid-seek */ }
        }

        tl = gsap.timeline({
          defaults: { overwrite: 'auto' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            // Roughly two screens of scroll for five seconds of film —
            // enough that a normal wheel flick does not skip the pour.
            end: function () { return '+=' + Math.round(global.innerHeight * 2.2); },
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.6,
            invalidateOnRefresh: true
          }
        });

        // The whole timeline is one unit long; everything else is a
        // fraction of it, so the copy always lands in the same place
        // however long the pin turns out to be.
        tl.to(head, { t: duration, ease: 'none', duration: 1, onUpdate: seek }, 0);
        tl.fromTo(copy,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.16 }, 0.02);
        tl.to(copy, { y: -14, ease: 'none', duration: 0.62 }, 0.18);
        tl.to(copy, { autoAlpha: 0, y: -34, ease: 'power2.in', duration: 0.16 }, 0.82);
      });

      return function () {
        cancelled = true;
        if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); }
        gsap.set(copy, { clearProps: 'all' });
      };
    }

    // ── touch: reveal on entry, pause on exit ──────────────────
    function ambient(tall) {
      load(tall ? SRC_TALL : SRC_WIDE);
      video.loop = true;
      section.setAttribute('data-reveal', 'pending');

      function show() {
        section.setAttribute('data-reveal', 'in');
        play();
      }

      // No observer, no hidden section. The reveal is a nicety; being
      // able to see the thing is not.
      if (!('IntersectionObserver' in global)) {
        show();
        return function () { video.pause(); section.removeAttribute('data-reveal'); };
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.intersectionRatio >= 0.3) show();
          else video.pause();
        });
      }, { threshold: [0, 0.3, 0.6] });

      io.observe(section);

      // Belt and braces: if the observer has not reported by the time the
      // section is plainly on screen, reveal it anyway rather than leave a
      // black panel sitting there.
      var guard = global.setInterval(function () {
        if (section.getAttribute('data-reveal') === 'in') return;
        var r = section.getBoundingClientRect();
        if (r.top < global.innerHeight * 0.7 && r.bottom > global.innerHeight * 0.3) show();
      }, 600);

      function onHidden() { if (doc.hidden) video.pause(); }
      doc.addEventListener('visibilitychange', onHidden);

      return function () {
        io.disconnect();
        global.clearInterval(guard);
        doc.removeEventListener('visibilitychange', onHidden);
        video.pause();
        section.removeAttribute('data-reveal');
      };
    }

    // ── reduced motion: show it, move nothing ──────────────────
    function calm(tall) {
      load(tall ? SRC_TALL : SRC_WIDE);
      video.loop = true;
      section.setAttribute('data-reveal', 'in');
      play();
      return function () { video.pause(); };
    }

    var mm = gsap.matchMedia();

    // A mouse on a wide screen gets the scrub. Touch tablets report as
    // wide but cannot seek smoothly, so they take the phone behaviour
    // with the wide crop.
    mm.add({
      calm:    '(prefers-reduced-motion: reduce)',
      narrow:  '(max-width: 767px)',
      precise: '(min-width: 768px) and (hover: hover) and (pointer: fine)'
    }, function (context) {
      var c = context.conditions;
      if (c.calm) return calm(c.narrow);
      if (c.narrow) return ambient(true);
      if (c.precise) return scrub();
      return ambient(false);
    });

    global.addEventListener('pagehide', function () { mm.revert(); }, { once: true });
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})(window);
