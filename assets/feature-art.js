/* ───────────────────────────────────────────────────────────────
   Onsite — feature artwork
   Drops one abstract SVG piece into each product card, matched by the
   card's own heading. Markup only; all motion lives in the stylesheet.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var VB = 'viewBox="0 0 200 78" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true"';

  function rnd(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }

  var ART = {
    // 01 — routes with travelling pips and the odd ripple
    booking: function () {
      return '<svg ' + VB + '>' +
        '<path class="rt" d="M-10 54C30 54 44 20 82 20s52 34 92 34"/>' +
        '<path class="rt" d="M-10 26C34 26 46 58 88 58s60-30 132-30"/>' +
        '<path class="rt fa-extra" d="M-10 68C40 68 60 40 104 40s54 22 116 22"/>' +
        '<circle class="pip" cx="26" cy="47" r="2.6"/>' +
        '<circle class="pip b" cx="40" cy="33" r="2"/>' +
        '<circle class="rip" cx="104" cy="30" r="4"/>' +
      '</svg>';
    },
    // 02 — soft bubbles converging on a morphing core
    ai: function () {
      return '<svg ' + VB + '>' +
        '<ellipse class="core" cx="100" cy="39" rx="17" ry="14"/>' +
        '<circle class="bub b1" cx="100" cy="39" r="9"/>' +
        '<circle class="bub b2" cx="100" cy="39" r="7"/>' +
        '<circle class="bub b3 fa-extra" cx="100" cy="39" r="5"/>' +
        '<circle class="meet" cx="100" cy="39" r="10"/>' +
      '</svg>';
    },
    // 03 — reflections drifting on glass, a wave passing through
    reflect: function () {
      var rows = [14, 24, 33, 42, 52, 62, 70];
      return '<svg ' + VB + '>' +
        rows.map(function (y, i) {
          var x1 = -10 + rnd(i + 1) * 26, x2 = 210 - rnd(i + 4) * 30;
          return '<line class="ln" x1="' + x1.toFixed(0) + '" y1="' + y + '" x2="' + x2.toFixed(0) + '" y2="' + (y + (i % 2 ? 1.5 : -1)) + '"/>';
        }).join('') +
        '<rect class="wave" x="-40" y="0" width="40" height="78" fill="rgb(var(--fa-green) / 0.10)"/>' +
      '</svg>';
    },
    // 04 — particles that briefly constellate
    particles: function () {
      var pts = [[24,20],[52,34],[38,58],[78,16],[96,44],[70,64],[124,26],[150,52],[168,20],[112,66],[186,40]];
      return '<svg ' + VB + '>' +
        '<line class="link" x1="24" y1="20" x2="52" y2="34"/>' +
        '<line class="link" x1="52" y1="34" x2="38" y2="58"/>' +
        '<line class="link" x1="96" y1="44" x2="124" y2="26"/>' +
        pts.map(function (p, i) {
          var r = i % 3 === 0 ? 2.4 : 1.6;
          return '<circle class="pt' + (i > 6 ? ' fa-extra' : '') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" style="animation-delay:-' + (i * 0.7).toFixed(1) + 's"/>';
        }).join('') +
      '</svg>';
    },
    // 05 — seeds drifting upward along uneven stems
    rise: function () {
      return '<svg ' + VB + '>' +
        '<path class="stem" d="M40 78C40 52 30 44 34 18"/>' +
        '<path class="stem" d="M84 78C84 56 96 46 92 22"/>' +
        '<path class="stem" d="M132 78C132 48 120 42 126 12"/>' +
        '<path class="stem fa-extra" d="M170 78C170 58 180 50 176 30"/>' +
        '<circle class="seed" cx="36" cy="40" r="2.4" fill="rgb(var(--fa-green))"/>' +
        '<circle class="seed" cx="90" cy="44" r="2" fill="rgb(var(--fa-deep))"/>' +
        '<circle class="seed" cx="126" cy="38" r="2.6" fill="rgb(var(--fa-brown))"/>' +
        '<circle class="seed fa-extra" cx="176" cy="46" r="1.8" fill="rgb(var(--fa-soft))"/>' +
      '</svg>';
    },
    // 06 — sheets folding, fragments adrift
    fold: function () {
      return '<svg ' + VB + '>' +
        '<path class="sheet" d="M52 16C78 8 116 12 142 22 132 44 128 56 134 70 104 60 76 62 54 70 62 50 58 30 52 16z"/>' +
        '<path class="sheet two" d="M74 26C92 20 116 24 132 32 126 46 124 54 128 64 106 56 88 58 74 64 80 50 78 36 74 26z"/>' +
        '<rect class="frag" x="24" y="22" width="7" height="5" rx="1"/>' +
        '<rect class="frag" x="166" y="46" width="6" height="4" rx="1"/>' +
        '<rect class="frag fa-extra" x="40" y="58" width="5" height="4" rx="1"/>' +
      '</svg>';
    },
    // 07 — strokes gathering into a mark, then apart
    converge: function () {
      return '<svg ' + VB + '>' +
        '<line class="edge" x1="72" y1="24" x2="128" y2="24"/>' +
        '<line class="edge" x1="128" y1="24" x2="100" y2="58"/>' +
        '<line class="edge" x1="100" y1="58" x2="72" y2="24"/>' +
        '<line class="edge fa-extra" x1="86" y1="41" x2="114" y2="41"/>' +
      '</svg>';
    },
    // 08 — comets along crossing arcs
    trails: function () {
      return '<svg ' + VB + '>' +
        '<path class="arc" id="fa-a1" d="M-10 62C40 62 60 14 108 14s62 44 112 44"/>' +
        '<path class="arc" d="M-10 18C44 18 58 64 110 64s58-40 110-40"/>' +
        '<path class="comet" d="M-10 62C40 62 60 14 108 14s62 44 112 44"/>' +
        '<path class="comet b" d="M-10 18C44 18 58 64 110 64s58-40 110-40"/>' +
        '<path class="comet c fa-extra" d="M-10 40C50 40 70 30 120 30s60 18 110 18"/>' +
      '</svg>';
    },
    // 09 — a quiet outward signal
    signal: function () {
      return '<svg ' + VB + '>' +
        '<circle class="ring" cx="92" cy="39" r="12"/>' +
        '<circle class="ring" cx="92" cy="39" r="12"/>' +
        '<circle class="ring fa-extra" cx="92" cy="39" r="12"/>' +
        '<circle class="core" cx="92" cy="39" r="3"/>' +
      '</svg>';
    },
    // 10 — two groups meeting and parting
    meet: function () {
      return '<svg ' + VB + '>' +
        '<g class="grp-l">' +
          '<circle class="dot" cx="66" cy="30" r="2.6"/><circle class="dot" cx="54" cy="44" r="2"/>' +
          '<circle class="dot" cx="72" cy="52" r="1.6"/><circle class="dot fa-extra" cx="46" cy="26" r="1.4"/>' +
        '</g>' +
        '<g class="grp-r">' +
          '<circle class="dot" cx="134" cy="46" r="2.6"/><circle class="dot" cx="146" cy="30" r="2"/>' +
          '<circle class="dot" cx="128" cy="24" r="1.6"/><circle class="dot fa-extra" cx="156" cy="50" r="1.4"/>' +
        '</g>' +
        '<circle class="burst" cx="100" cy="38" r="8"/>' +
      '</svg>';
    },
    // 11 — squares finding a loose grid
    grid: function () {
      var cells = [];
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 5; c++) {
          var i = r * 5 + c;
          var dx = (rnd(i + 2) * 26 - 13).toFixed(1), dy = (rnd(i + 9) * 22 - 11).toFixed(1);
          cells.push('<rect class="cell' + (i > 8 ? ' fa-extra' : '') + '" x="' + (66 + c * 16) + '" y="' + (20 + r * 16) +
            '" width="9" height="9" rx="1.5" style="--dx:' + dx + 'px;--dy:' + dy + 'px;animation-delay:-' + (i * 0.6).toFixed(1) + 's"/>');
        }
      }
      return '<svg ' + VB + '>' + cells.join('') + '</svg>';
    },
    // 12 — light sweeping across, one brighter pass
    sweep: function () {
      return '<svg ' + VB + '>' +
        '<path class="beam" d="M-20 60C30 60 50 22 100 22s70 38 120 38"/>' +
        '<path class="beam" d="M-20 30C40 30 56 62 106 62s64-34 114-34"/>' +
        '<path class="beam fa-extra" d="M-20 46C36 46 64 36 108 36s66 14 112 14"/>' +
        '<path class="flare" d="M-20 44C40 44 60 26 104 26s68 28 116 28"/>' +
      '</svg>';
    },
    // 13 — blurred shapes turning over
    morph: function () {
      return '<svg ' + VB + '>' +
        '<ellipse class="blob a" cx="84" cy="36" rx="26" ry="18"/>' +
        '<ellipse class="blob b" cx="124" cy="46" rx="20" ry="22"/>' +
        '<ellipse class="blob c fa-extra" cx="60" cy="52" rx="16" ry="12"/>' +
      '</svg>';
    },
    // 14 — rows setting, a corner folding
    doc: function () {
      return '<svg ' + VB + '>' +
        '<line class="row" x1="46" y1="24" x2="126" y2="24"/>' +
        '<line class="row" x1="46" y1="36" x2="140" y2="36"/>' +
        '<line class="row" x1="46" y1="48" x2="112" y2="48"/>' +
        '<line class="row fa-extra" x1="46" y1="60" x2="132" y2="60"/>' +
        '<path class="corner" d="M150 18h16v16z"/>' +
      '</svg>';
    }
  };

  // Card heading → artwork. Variants keep repeated themes from twinning.
  var MAP = [
    ['Online Booking',              'booking'],
    ['AI Receptionist',             'ai'],
    ['Website Maintenance',         'reflect'],
    ['Review Management',           'particles'],
    ['Local SEO',                   'rise'],
    ['Digital Menu',                'fold'],
    ['Logo Design',                 'converge'],
    ['Brand Kit',                   'morph'],
    ['Business Card Design',        'grid'],
    ['Flyer / Poster Design',       'sweep'],
    ['Menu Design',                 'fold'],
    ['Social Media Starter Pack',   'trails'],
    ['Social Media Content',        'trails'],
    ['Promo Video',                 'sweep'],
    ['AI Business Photos',          'morph'],
    ['Google Review QR Card',       'grid'],
    ['Business Email Setup',        'signal'],
    ['WhatsApp Business Setup',     'meet'],
    ['Business Document Templates', 'doc']
  ];

  function cardFor(node) {
    return node.closest('.pick .box, [data-ex-group] > div > div > div, .rounded-lg') || node.parentElement;
  }

  function start() {
    var used = {};
    var headings = doc.querySelectorAll('#services h3, #services .h-section, #extras .h-section');

    [].forEach.call(headings, function (h) {
      var label = h.textContent.trim();
      var match = null;
      for (var i = 0; i < MAP.length; i++) {
        if (label.indexOf(MAP[i][0]) === 0) { match = MAP[i]; break; }
      }
      if (!match) return;

      var card = cardFor(h);
      if (!card || card.querySelector('.fa')) return;

      var art = doc.createElement('div');
      art.className = 'fa fa--' + match[1];
      art.innerHTML = ART[match[1]]();

      // Stagger repeats of the same piece so no two cards move in step.
      used[match[1]] = (used[match[1]] || 0) + 1;
      if (used[match[1]] > 1) {
        art.style.setProperty('--fa-shift', used[match[1]]);
        [].forEach.call(art.querySelectorAll('*'), function (el, i) {
          var d = -(used[match[1]] * 2.3 + i * 0.4);
          var existing = el.style.animationDelay;
          if (!existing) el.style.animationDelay = d.toFixed(1) + 's';
        });
        if (used[match[1]] % 2 === 0) art.style.transform = 'scaleX(-1)';
      }

      card.insertBefore(art, card.firstChild);
    });
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})(window);
