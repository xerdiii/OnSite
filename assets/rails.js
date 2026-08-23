/* ───────────────────────────────────────────────────────────────
   Onsite — the side rails
   Two fixed columns either side of the shell, carrying one sequence of
   clips that advances with scroll position. Both rails show the same
   chapter at the same moment — one element the page passes through,
   not two decorations.

   Rewritten for reliability. The previous version put every clip in
   the DOM as its own <video>: four clips × two rails = eight decoders,
   more than a browser will keep awake at once, so whichever ones lost
   the draw stayed black and the rail looked broken at random. Each
   rail now owns exactly two elements and swaps the source between
   them — four decoders total, two of them idle.

   The other half of "sometimes it does not show": the old crossfade
   was scrubbed off scroll, so a clip could be fully faded in before it
   had decoded a single frame. Nothing fades in here until the incoming
   element reports data, and every element carries a poster, so the
   worst case is a still photograph rather than a hole.

   What it will not do:
     · exist below 1280px, where there is no gutter to live in
     · run under prefers-reduced-motion — the first clip holds, still
     · keep more than one live decoder per rail
     · take a pointer event, ever

   Adding a clip is one entry in CLIPS; nothing else needs to change.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  /* The sequence, in order. */
  var CLIPS = [
    { id: 'barber',   label: 'Barbershop' },
    { id: 'coffee',   label: 'Coffee' },
    { id: 'nails',    label: 'Salon' },
    { id: 'mechanic', label: 'Mechanic' }
    /* { id: 'aircon', label: 'Air con' } — waiting on the clip. */
  ];

  var BASE = 'assets/media/rail/';
  var MIN_W = 1280;
  var FADE = 620;   /* keep in step with the transition in rails.css */

  function init() {
    var host = doc.querySelector('[data-rails]');
    var region = doc.querySelector('[data-rails-region]');
    if (!host || !region) return;

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var wide = global.matchMedia('(min-width:' + MIN_W + 'px)');

    /* ── build: two elements per rail, and only two ──────────── */
    var rails = ['left', 'right'].map(function (side) {
      var rail = doc.createElement('div');
      rail.className = 'rail rail--' + side;

      var clip = doc.createElement('div');
      clip.className = 'rail-clip';

      var els = [0, 1].map(function () {
        var v = doc.createElement('video');
        v.className = 'rail-vid';
        v.muted = true; v.loop = true; v.playsInline = true;
        v.preload = 'auto';
        v.setAttribute('aria-hidden', 'true');
        clip.appendChild(v);
        return v;
      });

      var wash = doc.createElement('div');
      wash.className = 'rail-wash';

      rail.appendChild(clip);
      rail.appendChild(wash);
      host.appendChild(rail);

      return { rail: rail, els: els, cur: 0 };
    });

    var mark = doc.createElement('p');
    mark.className = 'rail-mark';
    mark.textContent = CLIPS[0].label;
    rails[0].rail.appendChild(mark);

    function pauseAll() {
      rails.forEach(function (r) {
        r.els.forEach(function (v) { if (!v.paused) v.pause(); });
      });
    }

    function setClip(el, i) {
      if (el.getAttribute('data-clip') === String(i)) return;
      el.setAttribute('data-clip', String(i));
      el.poster = BASE + CLIPS[i].id + '.jpg';
      el.src = BASE + CLIPS[i].id + '.mp4';
      el.load();
    }

    function playSafe(el) {
      var p = el.play();
      if (p && p.catch) p.catch(function () { /* refused — the poster stands in */ });
    }

    var at = -1;
    var live = false;

    function show(i, instant) {
      if (i === at) return;
      at = i;
      mark.textContent = CLIPS[i].label;
      if (!live) return;

      rails.forEach(function (r) {
        var incoming = r.els[1 - r.cur];
        var outgoing = r.els[r.cur];
        setClip(incoming, i);

        function swap() {
          /* Scroll may have moved on while this clip was loading. */
          if (at !== i || !live) return;
          playSafe(incoming);
          incoming.classList.add('is-on');
          outgoing.classList.remove('is-on');
          r.cur = 1 - r.cur;

          global.setTimeout(function () {
            /* Only stand the old one down if it is still the old one. */
            if (outgoing.classList.contains('is-on')) return;
            outgoing.pause();
            /* And line the next chapter up while it is idle. */
            if (at + 1 < CLIPS.length) setClip(outgoing, at + 1);
          }, instant ? 0 : FADE + 60);
        }

        /* readyState 2 is HAVE_CURRENT_DATA — there is a frame to show. */
        if (incoming.readyState >= 2) swap();
        else {
          incoming.addEventListener('loadeddata', swap, { once: true });
          /* If the file will not load at all, show it anyway rather than
             stranding the rail a chapter behind: the poster is set, so
             the worst case is a photograph. */
          incoming.addEventListener('error', swap, { once: true });
        }
      });
    }

    function setLive(on) {
      if (on === live) return;
      live = on;
      host.setAttribute('data-rails', on ? 'on' : '');
      if (on) {
        var i = at < 0 ? 0 : at;
        rails.forEach(function (r) { playSafe(r.els[r.cur]); });
        at = -1;
        show(i, true);
      } else {
        pauseAll();
      }
    }

    /* First chapter in place before anything scrolls, so the rail is
       never empty on arrival. */
    rails.forEach(function (r) {
      setClip(r.els[0], 0);
      r.els[0].classList.add('is-on');
    });

    if (reduced) {
      if (wide.matches) host.setAttribute('data-rails', 'on');
      return;
    }

    /* ── scroll → chapter ─────────────────────────────────────
       A plain rAF-throttled scroll read. The old version drove this
       through a scrubbed GSAP timeline, which is a lot of machinery
       for one integer, and it was the thing tying the fade to the
       scrub. GSAP is still loaded for the hero; the rails no longer
       need it, so they keep working if it fails to arrive. */
    var ticking = false;

    function progress() {
      var box = region.getBoundingClientRect();
      var travel = box.height - global.innerHeight;
      if (travel <= 0) return 0;
      return Math.min(1, Math.max(0, -box.top / travel));
    }

    function update() {
      ticking = false;
      if (!wide.matches) { setLive(false); return; }

      var box = region.getBoundingClientRect();
      setLive(box.top < global.innerHeight * 0.6 && box.bottom > global.innerHeight * 0.4);
      if (!live) return;

      var i = Math.floor(progress() * CLIPS.length);
      show(i > CLIPS.length - 1 ? CLIPS.length - 1 : (i < 0 ? 0 : i));
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(update);
    }

    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', onScroll, { passive: true });
    if (wide.addEventListener) wide.addEventListener('change', onScroll);
    else if (wide.addListener) wide.addListener(onScroll);

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { pauseAll(); return; }
      // rAF is frozen while hidden, so any scrolling that happened is
      // still unaccounted for. Re-read before resuming playback.
      onScroll();
      if (live) rails.forEach(function (r) { playSafe(r.els[r.cur]); });
    });

    update();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
