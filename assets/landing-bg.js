/* ───────────────────────────────────────────────────────────────
   Onsite — landing page artwork
   Builds the ribbon clusters for [data-bg] sections, the floating
   product cards in the hero, and fades the hero layer out as the
   page scrolls away from it.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Emerald → deep green → soft green → earth → warm brown
  var PALETTES = {
    hero: [
      ['h1', '#0B2E20', '#199A62', '#7FAE86'],
      ['h2', '#14523A', '#4E7A3C', '#B4864F'],
      ['h3', '#1B7A54', '#7A6234', '#D2AC72'],
      ['h4', '#0F3A28', '#2C8659', '#93A97C'],
      ['h5', '#3E5C38', '#94743E', '#DCC08D']
    ],
    cta: [
      ['c1', '#2FBE86', '#7FD3A8', '#D8E7DA'],
      ['c2', '#54A374', '#C2A470', '#EADFC8'],
      ['c3', '#8FD9B4', '#D6BC8A', '#F2EADA'],
      ['c4', '#1E8F63', '#63A97F', '#B8D4BE'],
      ['c5', '#6FBF95', '#C9A97A', '#EFE3CD']
    ]
  };

  function defs(pal, key) {
    var lin = pal.map(function (g, i) {
      var a = i % 2 ? { x1: 1, y1: 0, x2: 0, y2: 1 } : { x1: 0, y1: 0, x2: 1, y2: 1 };
      return '<linearGradient id="lb-' + g[0] + '" x1="' + a.x1 + '" y1="' + a.y1 + '" x2="' + a.x2 + '" y2="' + a.y2 + '">' +
        '<stop offset="0%" stop-color="' + g[1] + '"/>' +
        '<stop offset="52%" stop-color="' + g[2] + '"/>' +
        '<stop offset="100%" stop-color="' + g[3] + '"/></linearGradient>';
    }).join('');

    var warm = key === 'cta' ? '#8FD9B4' : '#1B7A54';
    var earth = key === 'cta' ? '#D6BC8A' : '#94743E';
    var op = key === 'cta' ? [0.26, 0.14] : [0.30, 0.16];

    return '<defs>' + lin +
      '<radialGradient id="lb-glowL-' + key + '">' +
        '<stop offset="0%" stop-color="' + warm + '" stop-opacity="' + op[0] + '"/>' +
        '<stop offset="56%" stop-color="' + earth + '" stop-opacity="' + op[1] + '"/>' +
        '<stop offset="100%" stop-color="' + earth + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="lb-glowR-' + key + '">' +
        '<stop offset="0%" stop-color="' + earth + '" stop-opacity="' + op[0] + '"/>' +
        '<stop offset="58%" stop-color="' + warm + '" stop-opacity="' + op[1] + '"/>' +
        '<stop offset="100%" stop-color="' + warm + '" stop-opacity="0"/>' +
      '</radialGradient></defs>';
  }

  // Concentric dashed arcs wrapping an invisible centre — the layered
  // ribbon look, without a single path being a closed ring visually.
  function cluster(side, cx, cy, spec, key) {
    var arcs = spec.map(function (a, i) {
      var rx = a.rx, ry = rx * a.ratio;
      var circ = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
      var dash = a.dash.map(function (f) { return (circ * f).toFixed(1); }).join(' ');
      return '<g class="lb-spin lb-spin--' + side + (i + 1) + '">' +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry.toFixed(0) + '"' +
        ' transform="rotate(' + a.tilt + ' ' + cx + ' ' + cy + ')" fill="none"' +
        ' stroke="url(#lb-' + a.grad + ')" stroke-width="' + a.w + '" stroke-linecap="round"' +
        ' stroke-dasharray="' + dash + '" stroke-dashoffset="' + a.off + '" opacity="' + a.op + '"/></g>';
    }).join('');

    var last = spec[spec.length - 1];
    return '<g class="lb-cluster lb-cluster--' + side + '">' +
      '<g class="lb-glow lb-glow--' + side + '">' +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (last.rx * 1.2).toFixed(0) +
        '" ry="' + (last.rx * last.ratio * 1.3).toFixed(0) +
        '" fill="url(#lb-glow' + (side === 'l' ? 'L' : 'R') + '-' + key + ')"/>' +
      '</g>' + arcs + '</g>';
  }

  function specs(key) {
    var p = key === 'cta' ? 'c' : 'h';
    var left = [
      { rx: 210, ratio: 0.72, tilt: -14, w: 1.6, grad: p + '1', op: 0.55, dash: [0.34, 0.22, 0.16, 0.28], off: 40 },
      { rx: 350, ratio: 0.66, tilt: 24,  w: 3,   grad: p + '2', op: 0.36, dash: [0.44, 0.26, 0.12, 0.18], off: 160 },
      { rx: 500, ratio: 0.74, tilt: -6,  w: 6,   grad: p + '5', op: 0.20, dash: [0.30, 0.34, 0.18, 0.18], off: 90 }
    ];
    var right = [
      { rx: 240, ratio: 0.64, tilt: 30,  w: 2,   grad: p + '3', op: 0.50, dash: [0.26, 0.20, 0.30, 0.24], off: 70 },
      { rx: 390, ratio: 0.80, tilt: -20, w: 4,   grad: p + '1', op: 0.32, dash: [0.38, 0.16, 0.22, 0.24], off: 10 },
      { rx: 546, ratio: 0.60, tilt: 12,  w: 8,   grad: p + '4', op: 0.18, dash: [0.28, 0.36, 0.18, 0.18], off: 260 }
    ];
    return { left: left, right: right };
  }

  function layer(section, key) {
    var s = specs(key);
    var div = doc.createElement('div');
    div.className = 'lb lb--' + key;
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML =
      '<svg class="lb-stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" focusable="false">' +
        defs(PALETTES[key], key) +
        cluster('l', 110, 450, s.left, key) +
        cluster('r', 1520, 420, s.right, key) +
      '</svg>';
    section.insertBefore(div, section.firstChild);
    return div;
  }

  function start() {
    var hero = doc.querySelector('[data-bg="hero"]');
    var cta = doc.querySelector('[data-bg="cta"]');
    if (!hero && !cta) return;

    var heroLayer = null;
    if (hero) { heroLayer = layer(hero, 'hero'); }
    if (cta) { layer(cta, 'cta'); }

    // Quieten the hero artwork as it scrolls away. The height is cached so
    // the scroll handler only ever writes one style property — no layout
    // reads on scroll, and no dependency on rAF being scheduled.
    if (heroLayer && !reduced) {
      var heroH = hero.offsetHeight || 1;
      var last = 0;

      var update = function () {
        var p = Math.min(1, Math.max(0, global.scrollY / heroH));
        heroLayer.style.opacity = (1 - p * 0.85).toFixed(3);
      };

      global.addEventListener('scroll', function () {
        var now = Date.now();
        if (now - last < 16) return;
        last = now;
        update();
      }, { passive: true });

      global.addEventListener('resize', function () {
        heroH = hero.offsetHeight || 1;
        update();
      }, { passive: true });

      update();
    }
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})(window);
