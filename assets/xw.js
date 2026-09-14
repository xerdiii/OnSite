/* ───────────────────────────────────────────────────────────────
   XOVAHWEB — page behaviour

   Four small jobs and nothing else:

     · the navbar compacting once the hero is behind it
     · the phone menu
     · scroll reveal, which is opt-in and fails open
     · the pricing and extras lists, rendered from Sitehouse.CATALOG
       so a price only ever exists in one place

   No framework, no build step, matching the rest of assets/.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  /* ══ Navbar ═══════════════════════════════════════════════════ */
  function nav() {
    var bar = doc.querySelector('[data-xw-nav]');
    if (!bar) return;

    var on = false;
    function check() {
      var should = global.scrollY > 24;
      if (should === on) return;          // one class write per crossing
      on = should;
      bar.classList.toggle('is-stuck', on);
    }
    global.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ══ Phone menu ═══════════════════════════════════════════════ */
  function menu() {
    var btn = doc.querySelector('[data-xw-burger]');
    var panel = doc.querySelector('[data-xw-menu]');
    if (!btn || !panel) return;

    function set(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.classList.toggle('is-open', open);
      /* Locking the body is what stops the page behind scrolling on
         iOS while a full-screen overlay is up. */
      doc.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = panel.querySelector('a, button');
        if (first) first.focus();
      }
    }

    btn.addEventListener('click', function () {
      set(btn.getAttribute('aria-expanded') !== 'true');
    });

    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) set(false);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) { set(false); btn.focus(); }
    });

    /* A drawer left open across a resize into desktop is a drawer
       covering a page that no longer has a button to close it. */
    global.addEventListener('resize', function () {
      if (global.innerWidth >= 900 && panel.classList.contains('is-open')) set(false);
    });
  }

  /* ══ Reveal ═══════════════════════════════════════════════════
     The hiding class is added from here, not from the markup, so a
     browser without IntersectionObserver — or a tab that never
     fires it — shows a finished page rather than an empty one. */
  function reveal() {
    var targets = doc.querySelectorAll('[data-xw-in]');
    if (!targets.length) return;

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in global)) return;

    doc.documentElement.classList.add('xw-watch');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    [].forEach.call(targets, function (el, i) {
      /* Groups stagger; everything else lands on its own. */
      var group = el.closest('[data-xw-stagger]');
      if (group) {
        var kids = group.querySelectorAll('[data-xw-in]');
        el.style.setProperty('--d', [].indexOf.call(kids, el));
      }
      io.observe(el);
    });

    /* Net two: anything already on screen that the observer has not
       reported yet. Passive, and it stops listening once everything
       has been shown. */
    function sweepVisible() {
      var left = doc.querySelectorAll('[data-xw-in]:not(.is-in)');
      if (!left.length) {
        global.removeEventListener('scroll', sweepVisible);
        return;
      }
      [].forEach.call(left, function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < global.innerHeight * 1.05 && r.bottom > 0) el.classList.add('is-in');
      });
    }
    global.addEventListener('scroll', sweepVisible, { passive: true });
    global.setTimeout(sweepVisible, 900);

    /* Net three: if after three seconds nothing at all has been
       revealed, the observer is not working in this browser. Drop the
       hiding class entirely rather than leave a blank page.

       Deliberately conditional — unhooking it unconditionally would
       also cancel the animation for everything further down, which is
       most of the page. */
    global.setTimeout(function () {
      if (doc.querySelector('[data-xw-in].is-in')) return;   // it works
      doc.documentElement.classList.remove('xw-watch');
    }, 3000);
  }

  /* ══ Prices, from the catalogue ═══════════════════════════════
     The three packages and the extras are rendered rather than typed
     out, so the landing page, the pricing page and the builder can
     never quote different numbers. */
  function money(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }

  /* A headline price loses its decimals when there are none to show.
     '€200' is a price; '€200.00' is a line on an invoice, and putting
     invoice formatting at 2.6rem is what makes a page look like a
     billing portal. Anything that is NOT round keeps its cents —
     €49.99 must never round to €50. */
  function bigMoney(cents) {
    var s = money(cents);
    return cents % 100 === 0 ? s.replace(/[.,]00/, '') : s;
  }

  var TICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.4l3.2 3.2L13 5"/></svg>';
  var CROSS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';
  var ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9.5M8.5 3.5L13 8l-4.5 4.5"/></svg>';

  /* What each package covers, in the customer's words rather than
     the catalogue's. Kept beside the render so the two stay in step;
     the PRICES still come from the catalogue. */
  var PLAN_COPY = {
    custom: {
      label: 'Starter',
      forWho: 'For a first site that has to look right',
      lines: [
        [1, 'Up to 20 sections, your pick of the 34'],
        [1, 'Domain, hosting &amp; SSL &mdash; first year'],
        [1, 'Built mobile-first'],
        [0, 'Search, analytics &amp; legal pages'],
        [0, 'Logo &amp; brand work']
      ]
    },
    full: {
      label: 'Pro',
      forWho: 'For a business that needs to be found',
      lines: [
        [1, 'All 34 sections, no cap'],
        [1, 'Domain, hosting &amp; SSL &mdash; first year'],
        [1, 'Built mobile-first'],
        [1, 'Search, analytics &amp; legal pages'],
        [0, 'Logo &amp; brand work']
      ]
    },
    complete: {
      label: 'Complete',
      forWho: 'For everything, handled end to end',
      lines: [
        [1, 'All 34 sections, no cap'],
        [1, 'Domain, hosting &amp; SSL &mdash; three years'],
        [1, 'Built mobile-first'],
        [1, 'Search, analytics &amp; legal pages'],
        [1, 'Logo, menu design &amp; local SEO']
      ]
    }
  };

  function plans() {
    var host = doc.querySelector('[data-xw-plans]');
    if (!host) return;
    var O = global.Sitehouse;
    if (!O || !O.CATALOG) return;        // markup keeps its noscript fallback

    var tiers = O.CATALOG.websites.filter(function (w) { return w.cents > 0; });

    host.innerHTML = tiers.map(function (w, i) {
      var copy = PLAN_COPY[w.key];
      if (!copy) return '';
      var lead = w.key === 'full';       // the one most businesses land on

      return '<article class="xw-plan' + (lead ? ' xw-plan--lead' : '') + '" data-xw-in>' +
        (lead ? '<span class="xw-plan__flag">Most chosen</span>' : '') +
        '<p class="xw-plan__name">' + copy.label + '</p>' +
        '<p class="xw-plan__for">' + copy.forWho + '</p>' +
        '<p class="xw-plan__fig">' +
          '<span class="xw-plan__amt cur" data-eur="' + (w.cents / 100) + '">' + bigMoney(w.cents) + '</span>' +
          '<span class="xw-plan__unit">one-time</span>' +
        '</p>' +
        '<ul class="xw-plan__list">' +
          copy.lines.map(function (l) {
            return '<li class="xw-plan__li' + (l[0] ? '' : ' xw-plan__li--off') + '">' +
              (l[0] ? TICK : CROSS) + '<span>' + l[1] + '</span></li>';
          }).join('') +
        '</ul>' +
        '<a class="xw-btn ' + (lead ? 'xw-btn--blue' : 'xw-btn--ghost') + ' xw-plan__cta" ' +
          'href="start.html?package=' + w.key + '">Start with this' +
          '<span class="xw-btn__arrow">' + ARROW + '</span></a>' +
      '</article>';
    }).join('');

    if (global.SitehouseI18n && global.SitehouseI18n.paintPrices) {
      global.SitehouseI18n.paintPrices(host);
    }
  }

  /* Six extras on the landing page, not sixty-six — the full list has
     its own page. These are the ones people actually ask for. */
  var EXTRA_PICKS = [
    ['Online booking system',      'Customers book a slot without calling you.'],
    ['Logo Design',                'A mark that works at every size.'],
    ['Multi-language website',     'Your site in a second language, properly.'],
    ['Basic SEO setup',            'Findable for what your business actually sells.'],
    ['Google Reviews integration', 'Your real reviews, live on the page.'],
    ['WhatsApp Business Setup',    'One tap from your site to a real conversation.']
  ];

  function extras() {
    var host = doc.querySelector('[data-xw-extras]');
    if (!host) return;
    var O = global.Sitehouse;
    if (!O || !O.CATALOG) return;

    var byName = {};
    O.CATALOG.oneTime.forEach(function (i) { byName[i.name.toLowerCase()] = i; });

    var rows = EXTRA_PICKS.map(function (pair) {
      var item = byName[pair[0].toLowerCase()];
      if (!item) return '';              // renamed in the catalogue: drop it rather than invent a price
      return '<div class="xw-extra" data-xw-in>' +
        '<div><p class="xw-extra__n">' + O.esc(item.name) + '</p>' +
        '<p class="xw-extra__d">' + pair[1] + '</p></div>' +
        '<p class="xw-extra__p">+<span class="cur" data-eur="' + (item.cents / 100) + '">' +
          bigMoney(item.cents) + '</span></p>' +
      '</div>';
    }).join('');

    host.innerHTML = rows;
    if (global.SitehouseI18n && global.SitehouseI18n.paintPrices) {
      global.SitehouseI18n.paintPrices(host);
    }
  }

  /* ══ Boot ═════════════════════════════════════════════════════ */
  ready(function () {
    nav();
    menu();
    plans();
    extras();
    // After the lists exist, so their cards are observed too.
    reveal();
  });

  // Re-format every figure when the currency changes.
  doc.addEventListener('xovah:i18n', function () { plans(); extras(); });
  doc.addEventListener('sitehouse:i18n', function () { plans(); extras(); });
})(window);
