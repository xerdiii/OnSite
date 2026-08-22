/* ───────────────────────────────────────────────────────────────
   Onsite — the navigation
   There is one nav and it is always on screen. Over the hero it is glass
   on dark footage; once the hero has gone past it takes the page's own
   surface, which is what makes it follow light and dark mode without a
   second palette.

   The switch is an IntersectionObserver on a sentinel rather than a
   scroll handler: no listener firing on every frame, and the browser
   works out the crossing itself.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  function init() {
    var nav = doc.querySelector('[data-nav]');
    if (!nav) return;

    var hero = doc.querySelector('[data-hero]');

    /* No hero on this page — the nav is solid from the start. */
    if (!hero) { nav.classList.add('is-solid'); return; }

    function solid(on) { nav.classList.toggle('is-solid', on); }

    if (!('IntersectionObserver' in global)) {
      /* Without an observer, read the scroll position directly. Passive,
         and cheap enough at this granularity. */
      var check = function () { solid(global.scrollY > hero.offsetHeight - nav.offsetHeight); };
      global.addEventListener('scroll', check, { passive: true });
      check();
      return;
    }

    /* A one-pixel sentinel sitting at the point where the hero's last
       screenful passes under the bar. */
    var mark = doc.createElement('div');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText = 'position:absolute;left:0;bottom:0;width:1px;height:1px;pointer-events:none';
    if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
    hero.appendChild(mark);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { solid(!e.isIntersecting); });
    }, { rootMargin: '-' + (nav.offsetHeight + 4) + 'px 0px 0px 0px' });

    io.observe(mark);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
