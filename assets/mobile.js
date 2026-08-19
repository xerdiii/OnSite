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
    { label: 'Our work',        href: 'index.html#work' },
    { label: 'Services',        href: 'index.html#services' },
    { label: 'Pricing',         href: 'index.html#pricing' },
    { label: 'Business Extras', href: 'index.html#extras' },
    { label: 'FAQ',             href: 'faq.html' },
    { label: 'Contact',         href: 'contact.html' },
    { label: 'Log in',          href: 'login.html' }
  ];

  var ICON_MENU = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_CLOSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // ── Drawer navigation ────────────────────────────────────────
  function buildNav() {
    // App shells (dashboard, admin) have their own navigation — no public drawer.
    if (doc.body.hasAttribute("data-app")) return;
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
    nav.appendChild(toggle);

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
