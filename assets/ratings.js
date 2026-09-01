/* ───────────────────────────────────────────────────────────────
   Xovah — customer ratings on the public page

   Reads the same store the dashboard writes to. In the demo that is
   localStorage; behind a real backend this becomes one fetch and
   nothing else in this file changes.

   The section ships hidden and is only revealed once there is
   something to show, so a visitor with JavaScript off gets no empty
   frame and no heading promising reviews that never arrive.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var host = doc.querySelector('[data-ratings]');
  if (!host || !global.Sitehouse) return;

  var list = (global.Sitehouse.load().ratings || []).slice();
  if (!list.length) return;

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="m12 3.1 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.6l6.1-.9z"/></svg>';

  function stars(n) {
    var out = '<span class="pub-rate-stars" role="img" aria-label="' + n + ' out of 5">';
    for (var i = 1; i <= 5; i++) out += '<span' + (i > n ? ' class="off"' : '') + '>' + STAR + '</span>';
    return out + '</span>';
  }

  var total = list.length;
  var avg = list.reduce(function (a, r) { return a + r.stars; }, 0) / total;

  doc.querySelector('[data-rate-head]').innerHTML =
    '<span class="rate-head-n">' + avg.toFixed(1) + '</span>' +
    stars(Math.round(avg)) +
    '<span class="rate-head-s">' + total + ' rating' + (total === 1 ? '' : 's') + '</span>';

  // Best first, and only the ones that actually said something — a bare
  // five stars with no words proves nothing to a stranger.
  var shown = list
    .filter(function (r) { return r.body && r.body.trim(); })
    .sort(function (a, b) { return b.stars - a.stars; })
    .slice(0, 6);

  if (!shown.length) return;

  doc.querySelector('[data-rate-list]').innerHTML = shown.map(function (r) {
    return '<figure class="pub-rate">' +
      stars(r.stars) +
      '<blockquote class="pub-rate-body">' + esc(r.body) + '</blockquote>' +
      '<figcaption class="pub-rate-who"><b>' + esc(r.business || r.who) + '</b>' +
        esc(r.who && r.business ? r.who : '') + '</figcaption>' +
    '</figure>';
  }).join('');

  host.hidden = false;
})(window);
