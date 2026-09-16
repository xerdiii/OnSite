/* Trusted businesses strip.
   The track holds the real cards once. It is cloned until it is wider than
   the screen plus one full set, then slid left a little every frame; when a
   whole set has gone past, the offset wraps back by exactly one set, which
   is invisible because the next set is identical. That is what lets a single
   business fill the strip today and twenty fill it later with no change here.

   The arrows step one card with an ease and hold the drift for a moment so
   the card you moved to stays put long enough to read. Hovering or focusing
   a card holds it too — nobody should have to click a moving link. On a
   phone the strip also follows your finger. Reduced motion: no drift, the
   arrows and swipe still work. */
(function () {
  'use strict';

  var stage = document.querySelector('[data-tb]');
  if (!stage) return;

  var viewport = stage.querySelector('[data-tb-viewport]');
  var track = stage.querySelector('[data-tb-track]');
  var prev = stage.querySelector('[data-tb-prev]');
  var next = stage.querySelector('[data-tb-next]');
  var originals = [].slice.call(track.children).filter(function (n) {
    return n.classList.contains('tb-card');
  });
  if (!viewport || !originals.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SPEED = 36;        // px per second
  var HOLD = 4000;       // ms the drift waits after an arrow press or a swipe

  var offset = 0, setW = 0, last = 0, holdUntil = 0;
  var hovering = false, focused = false, glide = null, drag = null;

  function gap() {
    var cs = getComputedStyle(track);
    return parseFloat(cs.columnGap || cs.gap) || 0;
  }
  function stride() { return originals[0].getBoundingClientRect().width + gap(); }
  function wrap() { if (setW) offset = ((offset % setW) + setW) % setW; }
  function paint() { track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)'; }

  function build() {
    [].slice.call(track.querySelectorAll('[data-tb-clone]')).forEach(function (n) {
      n.parentNode.removeChild(n);
    });
    setW = originals.reduce(function (w, c) {
      return w + c.getBoundingClientRect().width + gap();
    }, 0);
    if (!setW) return;

    var copies = Math.ceil((viewport.clientWidth + setW) / setW);
    for (var i = 0; i < copies; i++) {
      originals.forEach(function (c) {
        var n = c.cloneNode(true);
        n.setAttribute('data-tb-clone', '');
        n.setAttribute('aria-hidden', 'true');
        [].forEach.call(n.querySelectorAll('a, button'), function (a) { a.tabIndex = -1; });
        track.appendChild(n);
      });
    }
    wrap();
    paint();
  }

  function step(dir) {
    if (!setW) return;
    var now = performance.now();
    glide = { from: offset, to: offset + dir * stride(), t0: now, d: reduce.matches ? 1 : 480 };
    holdUntil = now + HOLD;
  }

  function tick(t) {
    var dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
    last = t;

    if (glide) {
      var p = Math.min(1, (t - glide.t0) / glide.d);
      var e = 1 - Math.pow(1 - p, 3);
      offset = glide.from + (glide.to - glide.from) * e;
      if (p >= 1) glide = null;
    } else if (!drag && !hovering && !focused && !reduce.matches && t > holdUntil) {
      offset += SPEED * dt;
    }

    wrap();
    paint();
    requestAnimationFrame(tick);
  }

  if (prev) prev.addEventListener('click', function () { step(-1); });
  if (next) next.addEventListener('click', function () { step(1); });

  stage.addEventListener('mouseenter', function () { hovering = true; });
  stage.addEventListener('mouseleave', function () { hovering = false; });
  stage.addEventListener('focusin', function () { focused = true; });
  stage.addEventListener('focusout', function () { focused = false; });

  /* Touch swipe. Mouse users have the arrows and hover-to-hold, and a mouse
     drag here would fight with clicking the links. */
  viewport.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    glide = null;
    drag = { x: e.clientX, start: offset, moved: false };
  });
  viewport.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    offset = drag.start - dx;
  });
  var swiped = false;
  function endDrag() {
    if (!drag) return;
    swiped = drag.moved;
    drag = null;
    holdUntil = performance.now() + HOLD;
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  // A swipe that ends on a link is not a tap on it. pointerup has already
  // cleared the drag by the time click fires, hence the separate flag.
  viewport.addEventListener('click', function (e) {
    if (swiped) { e.preventDefault(); swiped = false; }
  }, true);

  document.addEventListener('visibilitychange', function () { last = 0; });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  build();
  requestAnimationFrame(tick);
})();
