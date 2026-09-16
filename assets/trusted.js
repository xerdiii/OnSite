/* Trusted businesses rail.
   The rail is an ordinary horizontal scroll container with snap points, so it
   already swipes on a phone and takes arrow keys when focused. This only adds
   the two buttons on top, and gets out of the way when there is nothing to
   scroll — with a single business the arrows would be decoration. */
(function () {
  'use strict';

  var rail = document.querySelector('[data-tb-rail]');
  if (!rail) return;

  var prev = document.querySelector('[data-tb-prev]'),
      next = document.querySelector('[data-tb-next]'),
      nav  = prev && prev.parentNode;

  /* one card plus the gap, so a click always lands on a snap point */
  function stride() {
    var card = rail.querySelector('.tb-card');
    if (!card) return rail.clientWidth * 0.8;
    var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function overflows() {
    return rail.scrollWidth - rail.clientWidth > 4;
  }

  function sync() {
    var more = overflows();
    if (nav) nav.hidden = !more;
    if (!more) return;
    var max = rail.scrollWidth - rail.clientWidth;
    if (prev) prev.disabled = rail.scrollLeft <= 2;
    if (next) next.disabled = rail.scrollLeft >= max - 2;
  }

  function go(dir) {
    rail.scrollBy({
      left: dir * stride(),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });

  rail.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);

  /* images arrive late and change scrollWidth, so re-check once they land */
  Array.prototype.forEach.call(rail.querySelectorAll('img'), function (img) {
    if (img.complete) return;
    img.addEventListener('load', sync);
    img.addEventListener('error', sync);
  });

  sync();
})();
