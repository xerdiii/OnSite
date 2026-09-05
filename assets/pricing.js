/* ---------------------------------------------------------------
   Xovah - pricing spotlight

   Writes the pointer position into --spot-x / --spot-y on each card
   wrapper. The ring itself is drawn in CSS; this only supplies two
   numbers, so with JavaScript off the cards keep their resting border
   and nothing looks broken.

   Coarse pointers are skipped: there is no hover on a touch screen,
   so tracking there would only pin the glow wherever the last tap
   landed.
   --------------------------------------------------------------- */
(function (global) {
  'use strict';

  var doc = global.document;

  function wire() {
    if (global.matchMedia && global.matchMedia('(hover: none)').matches) return;

    var cards = doc.querySelectorAll('.pr-spot');
    if (!cards.length) return;

    for (var i = 0; i < cards.length; i++) {
      (function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.setProperty('--spot-x', (e.clientX - r.left) + 'px');
          el.style.setProperty('--spot-y', (e.clientY - r.top) + 'px');
        }, { passive: true });

        el.addEventListener('pointerleave', function () {
          el.style.setProperty('--spot-x', '-9999px');
          el.style.setProperty('--spot-y', '-9999px');
        });
      })(cards[i]);
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }
})(window);
