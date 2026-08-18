/* ───────────────────────────────────────────────────────────────
   Onsite — ambient background
   Two large abstract ribbon structures, one each side of the card.
   Original artwork built from stroked concentric arcs plus soft
   glow bodies; every layer animates on transform/opacity only.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;

  // Deep green → emerald → muted green → earth → warm tan
  var GRADS = [
    ['g1', '#0B2E20', '#199A62', '#7FAE86'],
    ['g2', '#14523A', '#4E7A3C', '#B4864F'],
    ['g3', '#1B7A54', '#7A6234', '#D2AC72'],
    ['g4', '#0F3A28', '#2C8659', '#93A97C'],
    ['g5', '#3E5C38', '#94743E', '#DCC08D']
  ];

  function defs() {
    var lin = GRADS.map(function (g, i) {
      var angle = i % 2 ? { x1: 1, y1: 0, x2: 0, y2: 1 } : { x1: 0, y1: 0, x2: 1, y2: 1 };
      return '<linearGradient id="au-' + g[0] + '" x1="' + angle.x1 + '" y1="' + angle.y1 +
             '" x2="' + angle.x2 + '" y2="' + angle.y2 + '">' +
        '<stop offset="0%" stop-color="' + g[1] + '"/>' +
        '<stop offset="52%" stop-color="' + g[2] + '"/>' +
        '<stop offset="100%" stop-color="' + g[3] + '"/>' +
      '</linearGradient>';
    }).join('');

    var glow =
      '<radialGradient id="au-glowL" cx="50%" cy="50%">' +
        '<stop offset="0%" stop-color="#1B7A54" stop-opacity="0.52"/>' +
        '<stop offset="55%" stop-color="#2F6B4C" stop-opacity="0.30"/>' +
        '<stop offset="100%" stop-color="#A9855C" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="au-glowR" cx="50%" cy="50%">' +
        '<stop offset="0%" stop-color="#14523A" stop-opacity="0.48"/>' +
        '<stop offset="58%" stop-color="#6E5F3C" stop-opacity="0.30"/>' +
        '<stop offset="100%" stop-color="#C7A87C" stop-opacity="0"/>' +
      '</radialGradient>';

    return '<defs>' + lin + glow + '</defs>';
  }

  // One cluster: concentric elliptical arcs wrapping an invisible centre,
  // each on its own slow rotation so the structure never reads as a ring.
  function cluster(side, cx, cy, spec) {
    var arcs = spec.map(function (a, i) {
      var rx = a.rx, ry = rx * a.ratio;
      // dash pattern turns each ellipse into flowing arc segments
      var circ = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
      var dash = a.dash.map(function (frac) { return (circ * frac).toFixed(1); }).join(' ');
      return '<g class="au-spin au-spin--' + side + (i + 1) + '">' +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry.toFixed(0) + '"' +
        ' transform="rotate(' + a.tilt + ' ' + cx + ' ' + cy + ')"' +
        ' fill="none" stroke="url(#au-' + a.grad + ')" stroke-width="' + a.w + '"' +
        ' stroke-linecap="round" stroke-dasharray="' + dash + '" stroke-dashoffset="' + a.off + '"' +
        ' opacity="' + a.op + '"/>' +
      '</g>';
    }).join('');

    return '<g class="au-cluster au-cluster--' + side + '">' +
      '<g class="au-glow au-glow--' + side + '">' +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + spec[spec.length - 1].rx * 1.15 + '" ry="' +
        (spec[spec.length - 1].rx * spec[spec.length - 1].ratio * 1.25).toFixed(0) +
        '" fill="url(#au-glow' + (side === 'l' ? 'L' : 'R') + ')"/>' +
      '</g>' + arcs + '</g>';
  }

  function build() {
    if (!doc.body || !doc.body.hasAttribute('data-aurora')) return;
    if (doc.querySelector('.aurora')) return;

    // Left: tighter, more upright. Right: wider, flatter, different tilts —
    // deliberately not a mirror of the left.
    var left = [
      { rx: 150, ratio: 0.74, tilt: -18, w: 2,   grad: 'g1', op: 0.88, dash: [0.30, 0.14, 0.18, 0.38], off: 40 },
      { rx: 225, ratio: 0.68, tilt: 8,   w: 3.5, grad: 'g2', op: 0.76, dash: [0.42, 0.20, 0.10, 0.28], off: 120 },
      { rx: 305, ratio: 0.72, tilt: -32, w: 6,   grad: 'g3', op: 0.68, dash: [0.26, 0.12, 0.34, 0.28], off: 0 },
      { rx: 395, ratio: 0.64, tilt: 22,  w: 9,   grad: 'g4', op: 0.52, dash: [0.48, 0.24, 0.14, 0.14], off: 220 },
      { rx: 495, ratio: 0.70, tilt: -8,  w: 14,  grad: 'g5', op: 0.36, dash: [0.34, 0.30, 0.20, 0.16], off: 90 },
      { rx: 188, ratio: 0.70, tilt: 46,  w: 2.5, grad: 'g4', op: 0.80, dash: [0.18, 0.10, 0.26, 0.46], off: 150 },
      { rx: 262, ratio: 0.86, tilt: -52, w: 5,   grad: 'g5', op: 0.62, dash: [0.22, 0.16, 0.30, 0.32], off: 30 },
      { rx: 350, ratio: 0.54, tilt: 62,  w: 8,   grad: 'g1', op: 0.50, dash: [0.36, 0.22, 0.12, 0.30], off: 200 },
      { rx: 444, ratio: 0.82, tilt: -44, w: 6,   grad: 'g3', op: 0.44, dash: [0.20, 0.14, 0.38, 0.28], off: 110 }
    ];
    var right = [
      { rx: 170, ratio: 0.62, tilt: 26,  w: 3.1, grad: 'g3', op: 0.95, dash: [0.24, 0.18, 0.30, 0.28], off: 70 },
      { rx: 250, ratio: 0.80, tilt: -12, w: 5.0,   grad: 'g1', op: 0.84, dash: [0.38, 0.12, 0.22, 0.28], off: 10 },
      { rx: 340, ratio: 0.58, tilt: 40,  w: 8.8,   grad: 'g5', op: 0.72, dash: [0.30, 0.26, 0.16, 0.28], off: 180 },
      { rx: 430, ratio: 0.76, tilt: -26, w: 13.8,  grad: 'g2', op: 0.58, dash: [0.44, 0.16, 0.24, 0.16], off: 60 },
      { rx: 540, ratio: 0.60, tilt: 14,  w: 20.0,  grad: 'g4', op: 0.44, dash: [0.28, 0.34, 0.18, 0.20], off: 260 },
      { rx: 205, ratio: 0.88, tilt: -38, w: 3.8,   grad: 'g2', op: 0.90, dash: [0.16, 0.12, 0.34, 0.38], off: 90 },
      { rx: 292, ratio: 0.52, tilt: 58,  w: 6.9, grad: 'g4', op: 0.70, dash: [0.26, 0.20, 0.22, 0.32], off: 240 },
      { rx: 385, ratio: 0.90, tilt: -60, w: 11.3,   grad: 'g3', op: 0.56, dash: [0.32, 0.18, 0.20, 0.30], off: 40 },
      { rx: 486, ratio: 0.56, tilt: 34,  w: 8.8,   grad: 'g1', op: 0.50, dash: [0.24, 0.26, 0.26, 0.24], off: 160 }
    ];

    var layer = doc.createElement('div');
    layer.className = 'aurora';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      '<svg class="aurora-stage" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false">' +
        defs() +
        cluster('l', 150, 520, left) +
        cluster('r', 1360, 470, right) +
      '</svg>';

    doc.body.insertBefore(layer, doc.body.firstChild);
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', build); }
  else { build(); }
})(window);
