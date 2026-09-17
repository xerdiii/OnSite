/* ───────────────────────────────────────────────────────────────
   Xovah — add-on picker
   Ticking a box adds a number. That is the whole feature: no form
   submit, no navigation, no reload, nothing sent anywhere. The choice
   is kept in this browser so it survives a refresh and can be handed
   to the dashboard when an account exists.

   Without JS every add-on and every price is still on the page as
   plain text — the checkboxes simply do nothing, which is the correct
   failure for a calculator.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var KEY = 'sitehouse.picks';

  function init() {
    var scope = doc.querySelector('[data-picker]');
    if (!scope) return;

    var boxes = [].slice.call(scope.querySelectorAll('.pick-cb'));
    if (!boxes.length) return;

    var panel   = scope.querySelector('[data-pick-total]');
    var countEl = scope.querySelector('[data-pick-count]');
    var onceEl  = scope.querySelector('[data-pick-once]');
    var fromEl  = scope.querySelector('[data-pick-from]');
    var clear   = scope.querySelector('[data-pick-clear]');

    /* The sticky bar, when the page has one. It is a mirror of the panel
       below, never a second source of truth. */
    var bar     = doc.querySelector('[data-ex-bar-sum]');
    var barCount= doc.querySelector('[data-ex-bar-count]');
    var barOnce = doc.querySelector('[data-ex-bar-once]');

    /* The same number again, pinned to the bottom of a phone screen,
       where the list is long enough that the panel below is off screen
       for most of the time you are using it. */
    var dock      = doc.querySelector('[data-ex-dock]');
    var dockCount = doc.querySelector('[data-ex-dock-count]');
    var dockOnce  = doc.querySelector('[data-ex-dock-once]');
    var bumpTimer = 0, lastShown = null;

    function money(n) {
      // Round to cents first, then decide. A total of 39.9975 is €40, not
      // €39.99 — but the design extras carry a real .99 and must keep it.
      var c = Math.round(n * 100) / 100;
      // Totals follow the chosen currency like every other price does.
      if (global.SitehouseI18n) return global.SitehouseI18n.format(c);
      return '€' + (c % 1 === 0 ? c : c.toFixed(2));
    }

    function read() {
      try { return JSON.parse(global.localStorage.getItem(KEY)) || []; }
      catch (e) { return []; }
    }

    function write(list) {
      try { global.localStorage.setItem(KEY, JSON.stringify(list)); }
      catch (e) { /* private mode — the total still works, it just forgets */ }
    }

    function total() {
      var once = 0, n = 0, from = false;

      boxes.forEach(function (b) {
        if (!b.checked) return;
        n++;
        once += parseFloat(b.getAttribute('data-price')) || 0;
        // "from €50" is a floor, not a quote. Say so rather than pretending.
        var label = b.parentNode.querySelector('.pick-price');
        if (label && /from/i.test(label.textContent)) from = true;
      });

      countEl.textContent = n;
      onceEl.textContent = money(once);
      fromEl.hidden = !from;
      panel.hidden = n === 0;

      if (bar) {
        bar.hidden = n === 0;
        barCount.textContent = n;
        barOnce.textContent = money(once);
      }

      if (dock) {
        var shown = money(once);
        dockCount.textContent = n;
        dockOnce.textContent = shown;
        dock.classList.toggle('is-up', n > 0);
        doc.body.classList.toggle('has-ex-dock', n > 0);
        if (lastShown !== null && shown !== lastShown) {
          dock.classList.add('is-bump');
          global.clearTimeout(bumpTimer);
          bumpTimer = global.setTimeout(function () { dock.classList.remove('is-bump'); }, 260);
        }
        lastShown = shown;
      }

      write(boxes.filter(function (b) { return b.checked; })
                 .map(function (b) { return b.getAttribute('data-pick'); }));
    }

    // Restore before wiring up, so the first total is the stored one.
    var saved = read();
    if (saved.length) {
      boxes.forEach(function (b) {
        if (saved.indexOf(b.getAttribute('data-pick')) > -1) b.checked = true;
      });
    }

    boxes.forEach(function (b) { b.addEventListener('change', total); });

    if (clear) {
      clear.addEventListener('click', function () {
        boxes.forEach(function (b) { b.checked = false; });
        total();
      });
    }

    // A label wrapping its own input already toggles it. Guard against the
    // double-fire some browsers produce when the click lands on the input.
    scope.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('pick-cb')) {
        e.stopPropagation();
      }
    });

    total();

    // Switching currency has to move these numbers too — they are computed,
    // so no data-eur span exists for the currency pass to find.
    if (global.SitehouseI18n) global.SitehouseI18n.onChange(total);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
