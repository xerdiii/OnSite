/* ───────────────────────────────────────────────────────────────
   Onsite — section backdrops
   Any element carrying [data-backdrop] with a <video> inside gets a
   looping film behind it. The film is not part of the page's meaning,
   so it is treated as a luxury throughout:

     · nothing is fetched until the section is nearly on screen
     · phones are served the portrait encode, not a wide one cropped
       down to a sliver by object-fit
     · it plays only while it is on screen, and stops with the tab
     · prefers-reduced-motion gets the still and no video at all

   The section keeps its own background colour underneath, so it reads
   correctly before the film arrives and if it never does.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var TALL = '(max-width: 767px)';

  function setup(section) {
    var video = section.querySelector('video');
    if (!video) return;

    var calm = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function still() {
      var tall = global.matchMedia(TALL).matches;
      return (tall && video.getAttribute('data-poster-tall')) || video.getAttribute('data-poster');
    }

    // Reduced motion: the still, painted on the media layer. No video
    // element is ever given a source.
    if (calm) {
      var art = still();
      var box = section.querySelector('.closer-media') || video.parentNode;
      if (art && box) box.style.backgroundImage = 'url("' + art + '")';
      return;
    }

    function load() {
      var tall = global.matchMedia(TALL).matches;
      var src = (tall && video.getAttribute('data-src-tall')) || video.getAttribute('data-src');
      if (video.getAttribute('src') === src) return;
      var art = still();
      if (art) video.setAttribute('poster', art);
      video.setAttribute('src', src);
    }

    function onScreen() {
      var r = section.getBoundingClientRect();
      return r.bottom > 0 && r.top < (global.innerHeight || 0);
    }

    function play() {
      load();
      var p = video.play();
      if (p && p.catch) p.catch(function () {
        // Rejected because there were no frames yet, or autoplay was
        // refused. One retry, and only if the section is still on screen —
        // a late canplay must not restart something already scrolled past.
        video.addEventListener('canplay', function () {
          if (!onScreen()) return;
          var q = video.play();
          if (q && q.catch) q.catch(function () {});
        }, { once: true });
      });
    }

    // The fade-up waits for real frames rather than the src being set.
    video.addEventListener('loadeddata', function () {
      section.setAttribute('data-backdrop', 'on');
    }, { once: true });

    if (!('IntersectionObserver' in global)) { play(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) play();
        else video.pause();
      });
    }, { rootMargin: '35% 0px' });
    io.observe(section);

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) video.pause();
      else if (video.getAttribute('src')) play();
    });
  }

  function init() {
    [].forEach.call(doc.querySelectorAll('[data-backdrop]'), setup);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
