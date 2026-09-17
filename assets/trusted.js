/* Trusted businesses.
   One card at a time, shown whole. The arrows move exactly one card and
   switch themselves off at either end — so with a single business both sit
   disabled, and the moment a second card is added to the markup they start
   working with no change here. Nothing moves on its own. On a phone the
   card also swipes. */
(function () {
  'use strict';

  var frame = document.querySelector('[data-tb]');
  if (!frame) return;

  var track = frame.querySelector('[data-tb-track]');
  var viewport = frame.querySelector('[data-tb-viewport]');
  var prev = frame.querySelector('[data-tb-prev]');
  var next = frame.querySelector('[data-tb-next]');
  var cards = [].slice.call(track.querySelectorAll('.tb-card'));
  if (!cards.length) return;

  var index = 0;

  function go(i) {
    index = Math.max(0, Math.min(cards.length - 1, i));
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    cards.forEach(function (c, n) {
      /* cards off screen are out of the tab order and hidden from readers */
      var here = n === index;
      c.setAttribute('aria-hidden', here ? 'false' : 'true');
      [].forEach.call(c.querySelectorAll('a'), function (a) { a.tabIndex = here ? 0 : -1; });
    });
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === cards.length - 1;
  }

  if (prev) prev.addEventListener('click', function () { go(index - 1); });
  if (next) next.addEventListener('click', function () { go(index + 1); });

  frame.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(index - 1); }
    else if (e.key === 'ArrowRight') { go(index + 1); }
  });

  /* touch swipe: a clear horizontal flick moves one card */
  var startX = null, startY = null;
  viewport.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
  }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
    startX = startY = null;
  }, { passive: true });

  go(0);
})();
