/* ───────────────────────────────────────────────────────────────
   Onsite — ambient background markup
   Injects the SVG ribbon layer on pages marked <body data-aurora>.
   Original artwork built from the Onsite palette: deep navy through
   slate to warm paper. Nothing here is copied from anyone else.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  function build() {
    if (!doc.body || !doc.body.hasAttribute('data-aurora')) return;
    if (doc.querySelector('.aurora')) return;

    var layer = doc.createElement('div');
    layer.className = 'aurora';
    layer.setAttribute('aria-hidden', 'true');

    // Three overlapping ribbons. Each is one smooth bezier sweep — the
    // heavy blur on the parent does the rest of the work, so the paths
    // stay cheap to rasterise.
    layer.innerHTML =
      '<svg class="aurora-stage" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" focusable="false">' +
        '<defs>' +
          '<linearGradient id="au-a" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%"   stop-color="#1C2B3A" stop-opacity="0.30"/>' +
            '<stop offset="52%"  stop-color="#3E5A75" stop-opacity="0.20"/>' +
            '<stop offset="100%" stop-color="#8CA4BC" stop-opacity="0.10"/>' +
          '</linearGradient>' +
          '<linearGradient id="au-b" x1="1" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"   stop-color="#27394B" stop-opacity="0.22"/>' +
            '<stop offset="60%"  stop-color="#7C93A8" stop-opacity="0.16"/>' +
            '<stop offset="100%" stop-color="#EEF0F2" stop-opacity="0.04"/>' +
          '</linearGradient>' +
          '<linearGradient id="au-c" x1="0" y1="1" x2="1" y2="0">' +
            '<stop offset="0%"   stop-color="#E8E2D6" stop-opacity="0.55"/>' +
            '<stop offset="55%"  stop-color="#D9D9D2" stop-opacity="0.28"/>' +
            '<stop offset="100%" stop-color="#B9C6D2" stop-opacity="0.16"/>' +
          '</linearGradient>' +
        '</defs>' +

        // Warm underlay — keeps the field from reading cold
        '<g class="aurora-band aurora-band--c">' +
          '<path fill="url(#au-c)" d="M-140 640C120 470 300 700 520 620S880 330 1140 400s240 340 40 470-560 130-800 40-160-200-520-270z"/>' +
        '</g>' +

        // Main navy ribbon sweeping across the upper field
        '<g class="aurora-band aurora-band--a">' +
          '<path fill="url(#au-a)" d="M-180 300C60 90 340 250 560 210 780 170 900-40 1120 40c220 80 180 330-20 430S540 590 360 640 40 720-120 620-420 510-180 300z"/>' +
        '</g>' +

        // Cooler counter-ribbon for depth
        '<g class="aurora-band aurora-band--b">' +
          '<path fill="url(#au-b)" d="M1320 180C1080 60 900 320 690 330 480 340 320 140 140 220-40 300-20 520 160 620s520 120 760 40 640-360 400-480z"/>' +
        '</g>' +
      '</svg>';

    doc.body.insertBefore(layer, doc.body.firstChild);
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', build); }
  else { build(); }
})(window);
