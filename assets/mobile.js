/* ───────────────────────────────────────────────────────────────
   Onsite — mobile behaviour
   Progressive enhancement only: every page works without this file,
   it just adds the drawer navigation, the FAQ accordion, scroll
   reveals and the table-to-card labelling on small screens.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Public-site navigation. Kept in one place so every page agrees.
  var LINKS = [
    { label: 'Home',            href: 'index.html' },
    { label: 'Services',        href: 'index.html#services' },
    { label: 'Pricing',         href: 'index.html#pricing' },
    { label: 'Business Extras', href: 'index.html#extras' },
    { label: 'FAQ',             href: 'faq.html' },
    { label: 'Contact',         href: 'contact.html' },
    { label: 'Log in',          href: 'login.html' }
  ];

  var ICON_MENU = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 9.5h15M4.5 15h9"/></svg>';
  var ICON_CLOSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // ── Drawer navigation ────────────────────────────────────────
  function buildNav() {
    // App shells (dashboard, admin) have their own navigation — no public
    // drawer. Neither does a page carrying [data-nav]: that nav is three
    // items wide by design and has nothing to fold away, so the burger
    // would be a control that opens a menu duplicating what is already
    // on screen.
    if (doc.body.hasAttribute("data-app") || doc.querySelector('[data-nav]')) return;
    var header = doc.querySelector("header");
    if (!header || doc.getElementById('m-drawer')) return;

    var nav = header.querySelector('nav') || header.firstElementChild;
    if (!nav) return;

    // The existing inline link cluster is the last flex child of the nav.
    var cluster = nav.querySelector('div.flex.items-center:last-child');
    if (cluster) cluster.classList.add('m-nav-desktop');

    var toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'm-nav-toggle';
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'm-drawer');
    toggle.innerHTML = ICON_MENU;
    // Into the link cluster, not the nav: the nav is justify-between, so a
    // third child of its own would sit in the middle of the bar.
    (cluster || nav).appendChild(toggle);

    var here = (global.location.pathname.split('/').pop() || 'index.html');

    var drawer = doc.createElement('div');
    drawer.id = 'm-drawer';
    drawer.className = 'm-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Menu');
    drawer.innerHTML =
      '<div class="m-drawer-head">' +
        '<span class="flex items-center gap-2.5">' +
          '<span style="display:block;width:14px;height:14px;border-radius:3px;background:rgb(var(--c-accent))"></span>' +
          '<span class="h-section" style="font-size:1.05rem">Onsite</span>' +
        '</span>' +
        '<button type="button" class="m-drawer-close" aria-label="Close menu">' + ICON_CLOSE + '</button>' +
      '</div>' +
      '<div class="m-drawer-body">' +
        LINKS.map(function (l, i) {
          var active = l.href.split('#')[0] === here;
          return '<a class="m-drawer-link" href="' + l.href + '" style="animation-delay:' + (i * 35) + 'ms">' +
            l.label + '<span>' + (active ? '•' : '→') + '</span></a>';
        }).join('') +
        '<a class="m-drawer-cta" href="signup.html">Build My Website</a>' +
        '<p class="m-drawer-note">Pay 25% to start. You review the finished website before the remaining 75% is due.</p>' +
      '</div>';
    doc.body.appendChild(drawer);

    var lastFocus = null;

    function open() {
      lastFocus = doc.activeElement;
      drawer.classList.add('is-open');
      doc.body.classList.add('m-locked');
      toggle.setAttribute('aria-expanded', 'true');
      var first = drawer.querySelector('.m-drawer-close');
      if (first) first.focus();
    }

    function close() {
      drawer.classList.remove('is-open');
      doc.body.classList.remove('m-locked');
      toggle.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    toggle.addEventListener('click', open);
    drawer.querySelector('.m-drawer-close').addEventListener('click', close);
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });

    global.OnsiteMobileNav = { open: open, close: close };
  }

  // ── FAQ accordion ────────────────────────────────────────────
  // Progressive: the <dt>/<dd> pairs stay readable if this never runs.
  function buildAccordions() {
    var lists = doc.querySelectorAll('[data-accordion]');
    [].forEach.call(lists, function (list) {
      var items = list.querySelectorAll('[data-acc-item]');
      [].forEach.call(items, function (item, i) {
        var head = item.querySelector('[data-acc-head]');
        var body = item.querySelector('[data-acc-body]');
        if (!head || !body) return;

        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'm-acc-btn';
        btn.setAttribute('aria-expanded', 'false');
        btn.id = 'acc-btn-' + i + '-' + Math.random().toString(36).slice(2, 6);

        var label = doc.createElement('span');
        label.className = 'h-section text-base';
        label.textContent = head.textContent.trim();

        var sign = doc.createElement('span');
        sign.className = 'm-acc-sign';
        sign.setAttribute('aria-hidden', 'true');
        sign.textContent = '+';

        btn.appendChild(label);
        btn.appendChild(sign);

        var panel = doc.createElement('div');
        panel.className = 'm-acc-panel';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', btn.id);
        var inner = doc.createElement('div');
        while (body.firstChild) { inner.appendChild(body.firstChild); }
        panel.appendChild(inner);

        head.replaceWith(btn);
        body.replaceWith(panel);

        btn.addEventListener('click', function () {
          var open = panel.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      });
    });
  }

  // ── Scroll reveal ────────────────────────────────────────────
  function reveal() {
    var targets = doc.querySelectorAll('[data-reveal]');
    if (!targets.length) return;
    if (reduced || !('IntersectionObserver' in global)) {
      [].forEach.call(targets, function (t) { t.classList.add('is-in'); });
      return;
    }
    [].forEach.call(targets, function (t) { t.classList.add('m-reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    [].forEach.call(targets, function (t) { io.observe(t); });
  }

  // ── Tables → cards ───────────────────────────────────────────
  // Copies each column's header onto its cells so the stacked card
  // layout still says what every number is.
  function labelTables(scope) {
    var tables = (scope || doc).querySelectorAll('table.m-cards');
    [].forEach.call(tables, function (t) {
      var heads = [].map.call(t.querySelectorAll('thead th'), function (h) { return h.textContent.trim(); });
      if (!heads.length) return;
      [].forEach.call(t.querySelectorAll('tbody tr'), function (row) {
        [].forEach.call(row.children, function (cell, i) {
          if (heads[i] && !cell.hasAttribute('data-label')) cell.setAttribute('data-label', heads[i]);
        });
      });
    });
  }

  function start() {
    buildNav();
    buildAccordions();
    reveal();
    labelTables();
  }

  global.OnsiteMobile = { labelTables: labelTables, reveal: reveal, reduced: reduced };

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})(window);

/* ── Business Extras category filter (landing page) ────────── */
(function () {
  var chips = document.querySelectorAll('[data-ex-filter]');
  if (!chips.length) return;

  var groups = document.querySelectorAll('[data-ex-group]');

  function apply(key) {
    [].forEach.call(groups, function (g) {
      var show = key === 'all' || g.getAttribute('data-ex-group') === key;
      g.style.display = show ? '' : 'none';
    });
    [].forEach.call(chips, function (c) {
      var on = c.getAttribute('data-ex-filter') === key;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  [].forEach.call(chips, function (c) {
    c.addEventListener('click', function () { apply(c.getAttribute('data-ex-filter')); });
  });
  apply('all');
})();

/* ── Pull to refresh ─────────────────────────────────────────
   Touch only, top of the page only. The puck follows the finger with
   a square-root falloff so the pull gets heavier the further it goes,
   the ring fills to the threshold, and release either springs back or
   reloads. Anything with [data-no-ptr] on it, and the app shells, opt
   out entirely — a drawer that scrolls is not a page you refresh. */
(function () {
  'use strict';

  var doc = document;
  if (doc.body.hasAttribute('data-app')) return;
  if (!('ontouchstart' in window)) return;

  var MAX = 96;        // furthest the puck travels
  var TRIGGER = 68;    // pull past this and the release reloads
  var CIRC = 56.5;     // 2πr for r = 9

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var puck = doc.createElement('div');
  puck.className = 'ptr';
  puck.setAttribute('aria-hidden', 'true');
  puck.innerHTML =
    '<svg viewBox="0 0 24 24">' +
      '<circle class="ptr-track" cx="12" cy="12" r="9"></circle>' +
      '<circle class="ptr-arc" cx="12" cy="12" r="9"></circle>' +
    '</svg>';
  doc.body.appendChild(puck);

  var arc = puck.querySelector('.ptr-arc');
  var shift = doc.querySelector('main') || doc.body;

  var startY = 0, dy = 0, pulling = false, armed = false, busy = false;

  function move(px, ready) {
    puck.style.transform =
      'translate3d(0,' + (px - 46) + 'px,0) scale(' + (0.72 + Math.min(px / MAX, 1) * 0.28) + ')';
    puck.style.opacity = Math.min(px / 34, 1);
    if (!ready) arc.style.strokeDashoffset = CIRC * (1 - Math.min(px / TRIGGER, 1));
    shift.style.transform = px > 0 ? 'translate3d(0,' + (px * 0.34) + 'px,0)' : '';
  }

  function reset(animated) {
    puck.classList.toggle('is-settling', animated !== false);
    shift.style.transition = animated === false ? '' : 'transform 380ms cubic-bezier(0.22,1,0.36,1)';
    puck.classList.remove('is-ready', 'is-loading');
    puck.style.transform = '';
    puck.style.opacity = '';
    arc.style.strokeDashoffset = '';
    shift.style.transform = '';
    window.setTimeout(function () {
      puck.classList.remove('is-live', 'is-settling');
      shift.style.transition = '';
      shift.classList.remove('ptr-shift');
    }, animated === false ? 0 : 400);
  }

  doc.addEventListener('touchstart', function (e) {
    if (busy || e.touches.length !== 1) return;
    if (window.scrollY > 0 || window.pageYOffset > 0) return;
    if (doc.querySelector('.m-drawer.is-open, .site-menu.is-open')) return;
    var t = e.target;
    while (t && t !== doc.body) {
      if (t.hasAttribute && t.hasAttribute('data-no-ptr')) return;
      t = t.parentNode;
    }
    startY = e.touches[0].clientY;
    dy = 0;
    pulling = true;
    armed = false;
  }, { passive: true });

  doc.addEventListener('touchmove', function (e) {
    if (!pulling || busy) return;
    var raw = e.touches[0].clientY - startY;

    // Scrolled up, or the page moved under us — this was never a pull.
    if (raw <= 0 || window.scrollY > 0) {
      if (armed) { reset(true); }
      pulling = false;
      return;
    }
    // A few pixels of slack, so a slow scroll does not arm the gesture.
    if (!armed) {
      if (raw < 12) return;
      armed = true;
      puck.classList.add('is-live', 'is-settling');
      shift.classList.add('ptr-shift');
      // One frame with the transition on lets it fade in rather than jump.
      window.setTimeout(function () { puck.classList.remove('is-settling'); }, 20);
    }

    e.preventDefault();

    // Square-root falloff: the first centimetre is free, the last is not.
    dy = Math.min(MAX, Math.sqrt(raw - 12) * 9.2);
    var ready = dy >= TRIGGER;
    if (ready !== puck.classList.contains('is-ready')) {
      puck.classList.toggle('is-ready', ready);
      if (ready && navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
    }
    move(dy, ready);
  }, { passive: false });

  function release() {
    if (!pulling) return;
    pulling = false;
    if (!armed) return;

    if (dy >= TRIGGER) {
      busy = true;
      puck.classList.add('is-settling', 'is-loading');
      puck.style.transform = 'translate3d(0,' + (TRIGGER - 46) + 'px,0) scale(1)';
      puck.style.opacity = '1';
      shift.style.transition = 'transform 380ms cubic-bezier(0.22,1,0.36,1)';
      shift.style.transform = 'translate3d(0,' + (TRIGGER * 0.34) + 'px,0)';
      // Long enough that the spin reads as an action, short enough that it
      // never feels like the page is stuck.
      window.setTimeout(function () { window.location.reload(); }, reduced ? 120 : 520);
    } else {
      reset(true);
    }
  }

  doc.addEventListener('touchend', release, { passive: true });
  doc.addEventListener('touchcancel', function () {
    if (armed && !busy) reset(true);
    pulling = false;
  }, { passive: true });
})();
