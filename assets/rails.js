/* ───────────────────────────────────────────────────────────────
   Onsite — the side rails
   Two fixed columns either side of the shell, carrying one sequence of
   clips that advances with scroll position.

   Both rails show the same chapter at the same moment — they are one
   element the page passes through, not two decorations. The handover is
   opacity plus a slow vertical drift, scrubbed off scroll, so it reads
   as continuous motion rather than a slideshow changing slides.

   What it will not do:
     · exist below 1280px, where there is no gutter to live in
     · run under prefers-reduced-motion — the first clip holds, still
     · load a clip that is not the current one or the next
     · keep more than one decoder per rail awake
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

  function init() {
    var host = doc.querySelector('[data-rails]');
    if (!host) return;

    var region = doc.querySelector('[data-rails-region]');
    if (!region) return;

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var wide = global.matchMedia('(min-width:' + MIN_W + 'px)');

    /* ── build ─────────────────────────────────────────────── */
    var rails = [];
    ['left', 'right'].forEach(function (side) {
      var rail = doc.createElement('div');
      rail.className = 'rail rail--' + side;

      var clip = doc.createElement('div');
      clip.className = 'rail-clip';

      var vids = CLIPS.map(function (c, i) {
        var v = doc.createElement('video');
        v.className = 'rail-vid';
        v.muted = true; v.loop = true; v.playsInline = true;
        v.preload = 'none';
        v.setAttribute('aria-hidden', 'true');
        v.setAttribute('poster', BASE + c.id + '.jpg');
        v.setAttribute('data-src', BASE + c.id + '.mp4');
        if (i === 0) v.style.opacity = '1';
        clip.appendChild(v);
        return v;
      });

      var wash = doc.createElement('div');
      wash.className = 'rail-wash';

      rail.appendChild(clip);
      rail.appendChild(wash);

      if (side === 'left') {
        var mark = doc.createElement('p');
        mark.className = 'rail-mark';
        mark.textContent = CLIPS[0].label;
        rail.appendChild(mark);
        rails.mark = mark;
      }

      host.appendChild(rail);
      rails.push({ vids: vids });
    });

    /* ── playback ──────────────────────────────────────────── */
    function load(i) {
      rails.forEach(function (r) {
        var v = r.vids[i];
        if (!v || v.getAttribute('src')) return;
        v.setAttribute('src', v.getAttribute('data-src'));
      });
    }

    function play(i) {
      rails.forEach(function (r) {
        var v = r.vids[i];
        if (!v) return;
        if (!v.getAttribute('src')) v.setAttribute('src', v.getAttribute('data-src'));
        var p = v.play();
        if (p && p.catch) p.catch(function () {
          v.addEventListener('canplay', function () {
            /* A late retry must not wake a chapter the scroll has left. */
            if (at !== i || !live) return;
            var q = v.play();
            if (q && q.catch) q.catch(function () {});
          }, { once: true });
        });
      });
    }

    function pauseAllBut(i) {
      rails.forEach(function (r) {
        r.vids.forEach(function (v, j) { if (j !== i && !v.paused) v.pause(); });
      });
    }

    function pauseAll() {
      rails.forEach(function (r) { r.vids.forEach(function (v) { if (!v.paused) v.pause(); }); });
    }

    var at = -1;
    var live = false;
    var idle = null;

    function chapter(i) {
      if (i === at) return;
      at = i;
      if (rails.mark && CLIPS[i]) rails.mark.textContent = CLIPS[i].label;
      if (!live) return;
      play(i);
      load(i + 1 < CLIPS.length ? i + 1 : i);
      global.clearTimeout(idle);
      /* The outgoing clip keeps running until it has faded, rather than
         freezing a frame that is still half on screen. */
      idle = global.setTimeout(function () { pauseAllBut(at); }, 900);
    }

    function setLive(on) {
      if (on === live) return;
      live = on;
      host.setAttribute('data-rails', on ? 'on' : '');
      if (on) { var i = at; at = -1; chapter(i < 0 ? 0 : i); }
      else { global.clearTimeout(idle); pauseAll(); }
    }

    /* ── reduced motion: the first chapter, held still ──────── */
    if (reduced) {
      if (wide.matches) { host.setAttribute('data-rails', 'on'); load(0); }
      return;
    }

    /* ── scroll ────────────────────────────────────────────── */
    var gsap = global.gsap;
    if (!gsap || !global.ScrollTrigger) {
      /* No GSAP: the rails still stand, on their first chapter. */
      if (wide.matches) { setLive(true); }
      return;
    }
    gsap.registerPlugin(global.ScrollTrigger);

    var tl = null;
    var mm = gsap.matchMedia();

    mm.add('(min-width:' + MIN_W + 'px)', function () {
      var all = [];
      rails.forEach(function (r) { all = all.concat(r.vids); });

      gsap.set(all, { autoAlpha: 0, yPercent: 0 });
      gsap.set([rails[0].vids[0], rails[1].vids[0]], { autoAlpha: 1 });

      var TR = 0.34; /* handover length, in chapters */

      tl = gsap.timeline({
        defaults: { overwrite: 'auto' },
        scrollTrigger: {
          trigger: region,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true,
          onToggle: function (self) { setLive(self.isActive); },
          onUpdate: function (self) {
            var i = Math.floor(self.progress * CLIPS.length + 0.22);
            chapter(i < 0 ? 0 : (i > CLIPS.length - 1 ? CLIPS.length - 1 : i));
          }
        }
      });

      /* One timeline unit per chapter, and the timeline has to actually
         be that long. Left alone it ends at the last handover — about
         3.1 units for four clips — so scroll progress mapped short and
         the label ran a whole chapter ahead of the picture. */
      tl.set({}, {}, CLIPS.length);

      CLIPS.forEach(function (c, i) {
        if (i === 0) return;
        var start = i - TR;
        var incoming = [rails[0].vids[i], rails[1].vids[i]];
        var outgoing = [rails[0].vids[i - 1], rails[1].vids[i - 1]];

        /* Linear on the fade: an eased crossfade dips in the middle and
           reads as a flash of empty rail. The drift is eased and runs a
           little longer, and is the only other thing moving. */
        tl.fromTo(incoming, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: TR }, start);
        tl.fromTo(incoming, { yPercent: 8 }, { yPercent: 0, ease: 'power2.out', duration: TR * 1.35 }, start);
        tl.to(outgoing, { autoAlpha: 0, ease: 'none', duration: TR }, start);
        tl.to(outgoing, { yPercent: -8, ease: 'power2.in', duration: TR * 1.35 }, start);
      });

      return function () {
        if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); tl = null; }
        setLive(false);
        at = -1;
        gsap.set(all, { clearProps: 'all' });
      };
    });

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) pauseAll();
      else if (live && at >= 0) play(at);
    });

    global.addEventListener('pagehide', function () { mm.revert(); }, { once: true });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
