/* ───────────────────────────────────────────────────────────────
   Onsite — landing hero behaviour
   Progressive enhancement. Without this file the hero still reads and
   every link in it still works: the dropdowns simply stay closed and
   the page header never hides.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var hero = doc.querySelector('[data-hero]');
  if (!hero) return;

  var items = [].slice.call(hero.querySelectorAll('[data-hero-item]'));
  var canHover = global.matchMedia && global.matchMedia('(hover: hover)').matches;

  // ── Desktop dropdowns ────────────────────────────────────────
  function close(item) {
    var dd = item.querySelector('[data-hero-dd]');
    var chev = item.querySelector('[data-hero-chev]');
    if (dd) dd.hidden = true;
    if (chev) chev.classList.remove('rotate-180');
    var trigger = item.querySelector('[data-hero-trigger]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function open(item) {
    var dd = item.querySelector('[data-hero-dd]');
    if (!dd) return;
    items.forEach(function (other) { if (other !== item) close(other); });
    dd.hidden = false;
    var chev = item.querySelector('[data-hero-chev]');
    if (chev) chev.classList.add('rotate-180');
    var trigger = item.querySelector('[data-hero-trigger]');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  items.forEach(function (item) {
    var dd = item.querySelector('[data-hero-dd]');
    var trigger = item.querySelector('[data-hero-trigger]');
    if (!dd || !trigger) return;

    if (canHover) {
      item.addEventListener('mouseenter', function () { open(item); });
      item.addEventListener('mouseleave', function () { close(item); });
    }

    // Touch, and keyboard through the button.
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      if (dd.hidden) open(item); else close(item);
    });
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') items.forEach(close);
  });

  doc.addEventListener('click', function (e) {
    items.forEach(function (item) { if (!item.contains(e.target)) close(item); });
  });

  // ── Mobile menu ──────────────────────────────────────────────
  var burger = hero.querySelector('[data-hero-burger]');
  var menu = hero.querySelector('[data-hero-menu]');
  var iconMenu = hero.querySelector('[data-hero-icon="menu"]');
  var iconClose = hero.querySelector('[data-hero-icon="close"]');
  var SHUT = ['pointer-events-none', '-translate-y-4', 'opacity-0'];
  var OPEN = ['pointer-events-auto', 'translate-y-0', 'opacity-100'];

  function setMenu(isOpen) {
    if (!menu) return;
    SHUT.concat(OPEN).forEach(function (c) { menu.classList.remove(c); });
    (isOpen ? OPEN : SHUT).forEach(function (c) { menu.classList.add(c); });
    if (iconMenu) {
      iconMenu.classList.toggle('rotate-90', isOpen);
      iconMenu.classList.toggle('scale-75', isOpen);
      iconMenu.classList.toggle('opacity-0', isOpen);
    }
    if (iconClose) {
      iconClose.classList.toggle('-rotate-90', !isOpen);
      iconClose.classList.toggle('scale-75', !isOpen);
      iconClose.classList.toggle('opacity-0', !isOpen);
    }
    if (burger) {
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      setMenu(menu.classList.contains('opacity-0'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  // ── The page header waits its turn ───────────────────────────
  // The hero carries the navigation while it is on screen; the page
  // header slides in once the footage has scrolled away.
  var header = doc.querySelector('.fp-header');
  var root = doc.documentElement;

  if (header) {
    var sync = function () {
      // A sliver of hero left is still hero — the header waits until
      // the footage is nearly gone rather than flickering in over it.
      if (hero.getBoundingClientRect().bottom > 120) root.setAttribute('data-hero-visible', '');
      else root.removeAttribute('data-hero-visible');
    };

    sync();
    global.addEventListener('scroll', sync, { passive: true });
    global.addEventListener('resize', sync);

    // Transitions only after the first frame, or the header would slide
    // away in front of the visitor on every load.
    global.setTimeout(function () { root.setAttribute('data-hero-ready', ''); }, 60);
  }
})(window);
