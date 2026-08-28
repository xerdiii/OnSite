/* ───────────────────────────────────────────────────────────────
   Sitehouse — package builder

   Renders the add-ons from Sitehouse.CATALOG rather than duplicating
   sixty-six names and prices in the markup. One source of truth: change
   a price in demo.js and this page changes with it.

   ── What is actually charged ──────────────────────────────────
   Paddle holds catalogue prices for the three websites only. A browser
   cannot invent an amount at checkout — that is the whole security
   model — so the card is charged 25% of the WEBSITE, never 25% of the
   basket. Extras are carried in customData, listed in the order email
   and invoiced with the balance.

   The summary therefore separates "total" from "pay today" and says
   which is which. Quoting a today-figure that includes extras would be
   a number Paddle then refuses to take.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var KEY = 'sitehouse.build';
  var O = global.Sitehouse;
  if (!O || !O.CATALOG) return;

  var CAT = O.CATALOG;
  var TIERS = {};
  CAT.websites.forEach(function (w) { if (w.cents > 0) TIERS[w.key] = w; });

  var state = { tier: null, extras: {} };

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return;
      var v = JSON.parse(raw);
      if (v && typeof v === 'object') {
        state.tier = TIERS[v.tier] ? v.tier : null;
        state.extras = (v.extras && typeof v.extras === 'object') ? v.extras : {};
      }
    } catch (e) { /* private mode, corrupt JSON — start clean */ }
  }
  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function money(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  var byKey = {};
  CAT.oneTime.forEach(function (i) { byKey[slug(i.name)] = i; });

  function totals() {
    var website = state.tier ? TIERS[state.tier].cents : 0;
    var extras = 0, n = 0;
    Object.keys(state.extras).forEach(function (k) {
      if (!state.extras[k] || !byKey[k]) return;
      extras += byKey[k].cents; n += 1;
    });
    // 25% of the website, floored — the same rule as everywhere else,
    // and the only figure Paddle will actually charge.
    var deposit = Math.floor(website * 0.25);
    return {
      website: website, extras: extras, count: n,
      total: website + extras,
      deposit: deposit,
      balance: (website + extras) - deposit
    };
  }

  /* ── Render the add-ons ─────────────────────────────────────── */
  function renderGroups() {
    var host = doc.querySelector('[data-bd-groups]');
    if (!host) return;

    var order = Object.keys(CAT.groups);
    var html = order.map(function (g) {
      var items = CAT.oneTime.filter(function (i) { return i.group === g; });
      if (!items.length) return '';

      var rows = items.map(function (i) {
        var k = slug(i.name);
        var on = !!state.extras[k];
        return '<label class="bd-item">' +
          '<input type="checkbox" data-bd-extra="' + k + '"' + (on ? ' checked' : '') + '>' +
          '<span class="bd-box" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 8.4l3 3 6.2-6.6"/></svg></span>' +
          '<span class="bd-item-name">' + O.esc(i.name) + '</span>' +
          '<span class="bd-item-price">' + (i.from ? 'from ' : '') + '<span class="cur" data-eur="' + (i.cents / 100) + '">' + money(i.cents) + '</span></span>' +
          '</label>';
      }).join('');

      return '<div class="bd-group" data-bd-group="' + g + '">' +
        '<button type="button" class="bd-group-btn" aria-expanded="false">' +
          '<span class="bd-group-name">' + O.esc(CAT.groups[g]) + '</span>' +
          '<span class="bd-group-meta">' +
            '<span class="bd-group-count" data-bd-gcount hidden>0</span>' +
            '<span>' + items.length + '</span>' +
            '<svg class="bd-group-chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg>' +
          '</span>' +
        '</button>' +
        '<div class="bd-group-body"><div class="bd-group-inner">' + rows + '</div></div>' +
      '</div>';
    }).join('');

    host.innerHTML = html;

    // Groups start closed: sixty-six checkboxes at once is not a choice,
    // it is a wall. Any group with something already ticked opens.
    [].forEach.call(host.querySelectorAll('[data-bd-group]'), function (grp) {
      var btn = grp.querySelector('.bd-group-btn');
      btn.addEventListener('click', function () {
        var open = grp.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    host.addEventListener('change', function (e) {
      var cb = e.target.closest ? e.target.closest('[data-bd-extra]') : null;
      if (!cb) return;
      var k = cb.getAttribute('data-bd-extra');
      if (cb.checked) state.extras[k] = true; else delete state.extras[k];
      save();
      paint();
    });

    if (global.SitehouseI18n && global.SitehouseI18n.paint) global.SitehouseI18n.paint(host);
  }

  /* ── Paint every figure ─────────────────────────────────────── */
  function paint() {
    var t = totals();
    var tier = state.tier ? TIERS[state.tier] : null;

    var lines = doc.querySelector('[data-bd-lines]');
    if (lines) {
      var rows = '';
      if (tier) {
        rows += '<div class="bd-sum-line"><dt>' + O.esc(tier.name) + '</dt><dd>' + money(tier.cents) + '</dd></div>';
      } else {
        rows += '<div class="bd-sum-line bd-sum-line--muted"><dt>No website chosen yet</dt><dd>&mdash;</dd></div>';
      }
      if (t.count) {
        rows += '<div class="bd-sum-line"><dt>' + t.count + ' add-on' + (t.count === 1 ? '' : 's') + '</dt><dd>' + money(t.extras) + '</dd></div>';
      }
      lines.innerHTML = rows;
    }

    var set = function (sel, v) {
      var el = doc.querySelector(sel);
      if (el) el.textContent = v;
    };
    set('[data-bd-total]', money(t.total));
    set('[data-bd-today]', money(t.deposit));
    set('[data-bd-balance]', money(t.balance));

    // group counters
    [].forEach.call(doc.querySelectorAll('[data-bd-group]'), function (grp) {
      var g = grp.getAttribute('data-bd-group');
      var n = CAT.oneTime.filter(function (i) {
        return i.group === g && state.extras[slug(i.name)];
      }).length;
      var badge = grp.querySelector('[data-bd-gcount]');
      if (badge) { badge.textContent = n; badge.hidden = n === 0; }
    });

    var ready = !!tier;
    [].forEach.call(doc.querySelectorAll('[data-bd-cta]'), function (btn) {
      btn.disabled = !ready;
    });
    [].forEach.call(doc.querySelectorAll('[data-bd-cta-text]'), function (el) {
      el.textContent = ready ? 'Pay ' + money(t.deposit) + ' and start' : 'Choose a website first';
    });

    var clear = doc.querySelector('[data-bd-clear]');
    if (clear) clear.hidden = !ready && !t.count;

    // mobile bar
    var bar = doc.querySelector('[data-bd-bar]');
    if (bar) {
      bar.classList.toggle('is-up', ready);
      bar.setAttribute('aria-hidden', ready ? 'false' : 'true');
      set('[data-bd-bar-today]', money(t.deposit) + ' today');
      var sub = doc.querySelector('[data-bd-bar-sub]');
      if (sub) {
        sub.textContent = ready
          ? tier.name + (t.count ? ' + ' + t.count + ' add-on' + (t.count === 1 ? '' : 's') : '') + ' · ' + money(t.total) + ' total'
          : 'Choose a website to start';
      }
    }
  }

  /* ── Checkout ───────────────────────────────────────────────── */
  function checkout() {
    if (!state.tier) return;
    var t = totals();
    var picked = Object.keys(state.extras).filter(function (k) { return state.extras[k] && byKey[k]; });

    var P = global.SitehousePaddle;
    if (P && P.configured && P.configured()) {
      // Extras ride along as data. Paddle charges the catalogue price
      // for the website deposit and nothing this page could alter.
      P.openWith(state.tier, {
        extras: picked.map(function (k) { return byKey[k].name; }).join(', '),
        extras_count: picked.length,
        extras_cents: t.extras,
        basket_total_cents: t.total
      });
      return;
    }

    // Checkout not live yet — hand them to the page that starts a
    // conversation rather than a dead button.
    global.location.href = 'start.html';
  }

  function wire() {
    [].forEach.call(doc.querySelectorAll('[data-bd-tier]'), function (r) {
      if (r.value === state.tier) r.checked = true;
      r.addEventListener('change', function () {
        if (!r.checked) return;
        state.tier = r.value;
        save();
        paint();
      });
    });

    [].forEach.call(doc.querySelectorAll('[data-bd-cta]'), function (btn) {
      btn.addEventListener('click', checkout);
    });

    var clear = doc.querySelector('[data-bd-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        state = { tier: null, extras: {} };
        save();
        [].forEach.call(doc.querySelectorAll('[data-bd-tier]'), function (r) { r.checked = false; });
        [].forEach.call(doc.querySelectorAll('[data-bd-extra]'), function (c) { c.checked = false; });
        [].forEach.call(doc.querySelectorAll('[data-bd-group]'), function (g) {
          g.classList.remove('is-open');
          var b = g.querySelector('.bd-group-btn');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        paint();
      });
    }
  }

  function init() {
    load();
    renderGroups();
    wire();

    // Open any group the visitor already has something ticked in, so a
    // returning basket is visible rather than hidden behind a chevron.
    [].forEach.call(doc.querySelectorAll('[data-bd-group]'), function (grp) {
      var g = grp.getAttribute('data-bd-group');
      var has = CAT.oneTime.some(function (i) { return i.group === g && state.extras[slug(i.name)]; });
      if (has) {
        grp.classList.add('is-open');
        var b = grp.querySelector('.bd-group-btn');
        if (b) b.setAttribute('aria-expanded', 'true');
      }
    });

    paint();
  }

  // Re-format every figure when the currency changes.
  doc.addEventListener('sitehouse:i18n', paint);

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  global.SitehouseBuild = { totals: totals, state: function () { return state; } };
})(window);
