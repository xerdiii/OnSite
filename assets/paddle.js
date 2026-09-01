/* ───────────────────────────────────────────────────────────────
   Xovah — Paddle checkout

   Opens Paddle's hosted overlay for the 25% deposit. The amount is
   never sent from here: the browser passes a price id, and Paddle
   charges whatever that price says in your catalogue. A tampered page
   can pick a different package, which is the same as clicking a
   different button — it cannot invent a cheaper number.

   What is paid is a deposit. The remaining 75% is invoiced on approval
   from the Paddle dashboard, which is also where the record of who
   still owes what lives — there is no database on this site.

   Switched off until assets/paddle-config.js is filled in. Until then
   every button keeps its href and behaves exactly as it does today.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var CFG = global.PADDLE_CONFIG || {};
  var SDK = 'https://cdn.paddle.com/paddle/v2/paddle.js';

  function configured() {
    if (!CFG.TOKEN) return false;
    var p = CFG.PRICES || {};
    return !!(p.custom || p.full || p.complete);
  }

  /* Every checkout button carries the package it sells. Buttons whose
     package has no price id yet are left completely alone. */
  function buttons() {
    return [].slice.call(doc.querySelectorAll('[data-checkout]'));
  }

  var loading = null;
  function sdk() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (global.Paddle) return resolve(global.Paddle);
      var s = doc.createElement('script');
      s.src = SDK;
      s.async = true;
      s.onload = function () { resolve(global.Paddle); };
      s.onerror = function () { reject(new Error('Paddle failed to load')); };
      doc.head.appendChild(s);
    }).then(function (Paddle) {
      if (CFG.ENVIRONMENT === 'sandbox') Paddle.Environment.set('sandbox');
      Paddle.Initialize({ token: CFG.TOKEN });
      return Paddle;
    });
    return loading;
  }

  function euro(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }

  /* 25% floored, balance takes the remainder — the same rule as
     Sitehouse.deposit()/balance(), so the figure quoted on the page
     cannot drift from the one in the confirmation. */
  function split(total) {
    var dep = Math.floor(total * 0.25);
    return { deposit: dep, balance: total - dep };
  }

  /* btn is optional — the package builder calls this with no button.
     extra is merged into customData, so the builder can send the
     add-ons the customer picked. None of it is a price: Paddle charges
     the catalogue amount for priceId and nothing else. */
  function mergeData(base, extra) {
    if (!extra) return base;
    Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }

  function open(pkg, btn, extra) {
    var priceId = (CFG.PRICES || {})[pkg];
    if (!priceId) return false;

    var total = (CFG.TOTALS || {})[pkg] || 0;
    var parts = split(total);

    if (btn) {
      btn.classList.add('is-busy');
      btn.setAttribute('aria-busy', 'true');
    }

    sdk().then(function (Paddle) {
      Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        settings: {
          displayMode: 'overlay',
          theme: doc.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
          locale: 'en'
        },
        /* Echoed back on the webhook. This is how the email that lands
           in your inbox knows which package was bought and what is
           still outstanding — none of it is trusted as a price. */
        customData: mergeData({
          package: pkg,
          total_cents: total,
          deposit_cents: parts.deposit,
          balance_cents: parts.balance,
          source: global.location.pathname
        }, extra)
      });
    })['catch'](function (err) {
      // Checkout could not open — fall through to the page the button
      // already pointed at rather than stranding them on a dead click.
      if (global.console) global.console.warn('paddle', err && err.message);
      var href = btn && btn.getAttribute('href');
      if (href) global.location.href = href;
    }).then(function () {
      if (btn) {
        btn.classList.remove('is-busy');
        btn.removeAttribute('aria-busy');
      }
    });

    return true;
  }

  function wire() {
    if (!configured()) return;             // leave every button untouched

    buttons().forEach(function (btn) {
      var pkg = btn.getAttribute('data-checkout');
      if (!(CFG.PRICES || {})[pkg]) return;   // this one is not for sale yet

      // Tell people what the click actually charges, before they click.
      var total = (CFG.TOTALS || {})[pkg] || 0;
      if (total && !btn.getAttribute('title')) {
        btn.setAttribute('title',
          'Pay ' + euro(split(total).deposit) + ' now, ' +
          euro(split(total).balance) + ' on approval');
      }

      btn.addEventListener('click', function (e) {
        // Only take over the click if checkout is genuinely ready.
        if (open(pkg, btn)) e.preventDefault();
      });
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire);
  else wire();

  global.SitehousePaddle = {
    configured: configured,
    open: open,
    /* Used by the package builder: no button, plus the chosen add-ons. */
    openWith: function (pkg, extra) { return open(pkg, null, extra); },
    split: split
  };
})(window);
