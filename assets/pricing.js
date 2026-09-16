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

/* ───────────────────────────────────────────────────────────────
   The extras list, rendered from the catalogue

   Every add-on and every price, on the page rather than a click
   away, because a pricing page that hides half its prices is not a
   pricing page. Built from Sitehouse.CATALOG so this list and the
   builder on /start can never quote different numbers.

   Grouped and closed to begin with: seventy-six lines at once is not
   a choice, it is a wall. Each group says how many are inside, so
   nothing is hidden — only folded.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  function money(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }

  function render() {
    var host = doc.querySelector('[data-pr-extras]');
    if (!host) return;

    var O = global.Sitehouse;
    if (!O || !O.CATALOG) return;   // the noscript fallback already links out
    var CAT = O.CATALOG;

    function row(item) {
      return '<div class="pr-x-row">' +
        '<span class="pr-x-name">' + O.esc(item.name) + '</span>' +
        '<span class="pr-x-price">' +
          (item.from ? '<span class="pr-x-from">from</span> ' : '') +
          '<span class="cur" data-eur="' + (item.cents / 100) + '">' + money(item.cents) + '</span>' +
        '</span>' +
      '</div>';
    }

    function group(title, rows, count, note) {
      return '<details class="pr-x-group">' +
        '<summary>' +
          '<span class="pr-x-group-name">' + O.esc(title) + '</span>' +
          '<span class="pr-x-group-n">' + count + '</span>' +
        '</summary>' +
        '<div class="pr-x-body">' +
          (note ? '<p class="pr-x-note">' + O.esc(note) + '</p>' : '') +
          rows +
        '</div>' +
      '</details>';
    }

    var html = Object.keys(CAT.groups).map(function (g) {
      var items = CAT.oneTime.filter(function (i) { return i.group === g; });
      if (!items.length) return '';
      var rows = items.map(function (i) { return row(i); }).join('');
      return group(CAT.groups[g], rows, items.length, 'Paid once, with the build.');
    }).join('');

    host.innerHTML = html;

    if (global.SitehouseI18n && global.SitehouseI18n.paintPrices) {
      global.SitehouseI18n.paintPrices(host);
    }
  }

  // Re-format every figure when the currency changes.
  doc.addEventListener('xovah:i18n', render);
  doc.addEventListener('sitehouse:i18n', render);

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})(window);
