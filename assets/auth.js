/* ───────────────────────────────────────────────────────────────
   Onsite — authentication layout engine
   Three modes off one markup tree.

     land     ≥700px landscape. The photo column eases back as the frame
              narrows, and the card interior is *scaled* from the 613×922
              reference, so every fixed pixel value in auth.css holds at
              any size.
     tabport  ≥700px portrait. Two columns have nowhere to go, so the
              photo becomes a masthead and the card interior goes fluid —
              written as CSS vars derived from the card's own measure.
     phone    <700px. Real document flow. Nothing is viewport-scaled, so
              type stays readable and short screens scroll.

   Mode-switch hygiene: every branch writes inline styles, and inline
   styles outrank the stylesheet. clearInline() runs first on each pass,
   or the outgoing mode's left/top/width stay latched and the incoming
   mode's CSS never lands — the layout would only come right on reload.
   None of these elements carry a style attribute in the markup.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var REF_W = 1464, REF_H = 949, PHOTO_W = 836, PANE_W = 628, CARD_W = 613, CARD_H = 922;
  var CONTENT_H = 697;
  var IMG_W = 1177, IMG_H = 1336, IMG_REF_SCALE = 836 / 1177;
  var PANE_RATIO = PANE_W / REF_W;
  var HERO_W = 681, HERO_H = 219;
  var REF_CARD_ASPECT = 692 / 855;
  var RAMP_HI = 1280, RAMP_LO = 1000, PHOTO_MIN = 0.42;
  var RAMP_LO2 = 820, PHOTO_MIN2 = 0.36;

  var TP = {"pad":0.1076,"h1Top":0.08656,"h1Fs":0.06839,"subTop":0.17368,"subFs":0.0309,"emTop":0.25435,"emH":0.10257,"emR":0.0202,"ephFs":0.02702,"ephPad":0.0332,"pwTop":0.36851,"pwH":0.10839,"btnTop":0.50435,"btnH":0.10981,"btnFs":0.0275,"arrow":0.026,"btnGap":0.02,"divTop":0.68222,"orFs":0.02245,"orPad":0.051,"divH":0.0026,"gTop":0.76445,"gH":0.09966,"gIcon":0.032,"gtFs":0.03205,"gGap":0.026,"btTop":0.89668,"btFs":0.02876,"heroFs":0.1058,"badgeH":0.0742,"heroLh":1.1246,"heroBot":0.06493,"heroGap":-0.30423,"heroSide":0.0525};

  var doc = document;
  var body = doc.body;
  var photo = doc.querySelector('.photo');
  var pane  = doc.querySelector('.pane');
  var card  = doc.getElementById('card');
  var cardIn = doc.getElementById('cardIn');
  var hero  = doc.getElementById('hero');
  if (!photo || !pane || !card || !cardIn || !hero) return;

  var mqLandscape = window.matchMedia('(min-width:700px) and (min-aspect-ratio:51/50)');
  var mqPortrait  = window.matchMedia('(min-width:700px) and (max-aspect-ratio:51/50)');

  function clearInline() {
    photo.style.cssText = '';
    pane.style.cssText = '';
    card.style.cssText = '';
    cardIn.style.cssText = '';
    hero.style.cssText = '';
  }

  var vTall = doc.querySelector('.photo-img--tall');
  var vWide = doc.querySelector('.photo-img--wide');

  /* Both variants sit in the markup so CSS can choose between them, but a
     hidden video still costs a download and a decode. Only the one on
     screen is ever started; the other stays at preload="none". */
  function activateVideo(mode) {
    var want = (mode === 'land') ? vTall : vWide;
    var idle = (want === vTall) ? vWide : vTall;
    if (idle && !idle.paused) idle.pause();
    if (!want) return;
    var p = want.play();
    if (p && p.catch) p.catch(function () {
      want.addEventListener('canplay', function () {
        var q = want.play();
        if (q && q.catch) q.catch(function () {});
      }, { once: true });
    });
  }

  /* Pages that can never fit the fixed composition say so in markup;
     tablet portrait puts every page into the same state. */
  var alwaysFlow = cardIn.hasAttribute('data-flow');

  function setMode(mode) {
    body.classList.toggle('tabport', mode === 'tabport');
    body.classList.toggle('stacked', mode === 'phone');
    cardIn.classList.toggle('card-in--flow', alwaysFlow || mode === 'tabport');
    activateVideo(mode);
  }

  /* The photo yields width to the card as the frame narrows, in two eased
     ramps rather than one step, so there is never a jump. */
  function photoRatio(vw) {
    var full = 1 - PANE_RATIO;
    if (vw >= RAMP_HI) return full;
    if (vw >= RAMP_LO) return full + (PHOTO_MIN - full) * ((RAMP_HI - vw) / (RAMP_HI - RAMP_LO));
    if (vw >= RAMP_LO2) return PHOTO_MIN + (PHOTO_MIN2 - PHOTO_MIN) * ((RAMP_LO - vw) / (RAMP_LO - RAMP_LO2));
    return PHOTO_MIN2;
  }

  function placeCard(paneW, vh) {
    var cs = Math.min(paneW / PANE_W, vh / CONTENT_H);
    var gapL = 1 * cs, mT = 14 * cs, mB = 13 * cs, mR = 14 * cs;
    var cw = Math.max(CARD_W * cs, paneW - gapL - mR);
    var ch = vh - mT - mB;
    card.style.left = gapL + 'px';
    card.style.top = mT + 'px';
    card.style.width = cw + 'px';
    card.style.height = ch + 'px';
    card.style.borderRadius = (26 * cs) + 'px';
    card.style.borderWidth = Math.max(1, cs) + 'px';
    /* A flowing interior sizes itself off the card; scaling it as well
       would compound the two. */
    if (!alwaysFlow) cardIn.style.transform = 'translate(' + ((cw - CARD_W * cs) / 2) + 'px,0) scale(' + cs + ')';
  }

  /* The hero rides the video's own cover-scale so badge and headline stay
     locked to the bird, but is never allowed wider than its panel. */
  function seatHero(photoW, vh) {
    var bandH = vh;
    var imgScale = Math.max(photoW / IMG_W, bandH / IMG_H);
    var s = Math.min(imgScale / IMG_REF_SCALE, photoW * 0.92 / HERO_W);
    hero.style.bottom = '0px';
    hero.style.transformOrigin = 'left bottom';
    hero.style.transform = 'scale(' + s + ')';
  }

  function headlineMeasure() {
    var probe = doc.createElement('span');
    var cs = getComputedStyle(doc.getElementById('hl1'));
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0';
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.wordSpacing = cs.wordSpacing;
    probe.style.fontVariationSettings = cs.fontVariationSettings;
    probe.textContent = (doc.getElementById('hl1').textContent + ' ' +
                         doc.getElementById('hl2').textContent).trim();
    doc.body.appendChild(probe);
    var w = probe.getBoundingClientRect().width;
    doc.body.removeChild(probe);
    return w;
  }

  function camelToVar(k) { return '--tp-' + k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }); }

  function layoutTabport(vw, vh) {
    var band = Math.round(vh * 0.425);
    var side = Math.round(vw * TP.heroSide);
    var footer = Math.round(vh * 0.0297);

    photo.style.left = '0px';
    photo.style.top = '0px';
    photo.style.width = '100%';
    photo.style.height = band + 'px';

    pane.style.left = '0px';
    pane.style.right = '0px';
    pane.style.top = band + 'px';
    pane.style.bottom = '0px';

    var cw = vw - side * 2;
    var ch = vh - band - footer;
    card.style.left = side + 'px';
    card.style.top = '0px';
    card.style.width = cw + 'px';
    card.style.height = ch + 'px';

    var S = Math.min(ch, cw * REF_CARD_ASPECT);
    var st = body.style;
    st.setProperty('--tp-pad', (cw * TP.pad) + 'px');
    st.setProperty('--tp-or-pad', (cw * TP.orPad) + 'px');
    ['h1Top','subTop','emTop','pwTop','btnTop','divTop','gTop','btTop'].forEach(function (k) {
      st.setProperty(camelToVar(k), (ch * TP[k]) + 'px');
    });
    ['h1Fs','subFs','emH','emR','ephFs','ephPad','pwH','btnH','btnFs','arrow','btnGap',
     'orFs','divH','gH','gIcon','gtFs','gGap','btFs'].forEach(function (k) {
      st.setProperty(camelToVar(k), (S * TP[k]) + 'px');
    });

    st.setProperty('--tp-side', side + 'px');
    st.setProperty('--tp-hero-b', (band * TP.heroBot) + 'px');
    st.setProperty('--tp-hero-gap', (band * TP.heroGap) + 'px');
    st.setProperty('--tp-hero-fs', (band * TP.heroFs) + 'px');
    st.setProperty('--tp-hero-lh', TP.heroLh);
    st.setProperty('--badge-k', (band * TP.badgeH / 37));
    st.setProperty('--tp-hl-measure', Math.round(headlineMeasure() * 0.61) + 'px');
  }

  function layoutLand(vw, vh) {
    var ratio = photoRatio(vw);
    var photoW = vw * ratio;
    photo.style.width = (ratio * 100) + '%';
    photo.style.height = '100%';
    pane.style.left = (ratio * 100) + '%';
    pane.style.right = '0';
    pane.style.top = '0';
    pane.style.bottom = '0';
    placeCard(vw - photoW, vh);
    seatHero(photoW, vh);
  }

  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight;
    clearInline();

    if (vw < 700) {
      /* Deliberately empty beyond the mode flag — measuring here would
         only re-introduce the stale inline values clearInline just wiped. */
      setMode('phone');
      return;
    }
    if (mqPortrait.matches) { setMode('tabport'); layoutTabport(vw, vh); return; }
    setMode('land');
    layoutLand(vw, vh);
  }

  window.addEventListener('resize', layout, { passive: true });
  window.addEventListener('orientationchange', layout);
  if (mqLandscape.addEventListener) {
    mqLandscape.addEventListener('change', layout);
    mqPortrait.addEventListener('change', layout);
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
  layout();
})();

/* ───────────────────────────────────────────────────────────────
   Entrance — runs exactly once, on load, never on resize.
   Surface establishes depth, brand promise overlaps it, and the
   functional form groups resolve last.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function releaseEntrance() {
    document.documentElement.classList.remove('entry-pending');
    if (window.__entryFallback) { clearTimeout(window.__entryFallback); window.__entryFallback = null; }
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (reduced || !Element.prototype.animate) { releaseEntrance(); return; }

  var ease = 'cubic-bezier(.16,1,.3,1)';
  var softEase = 'cubic-bezier(.22,1,.36,1)';
  var compact = window.matchMedia('(max-width:699px)').matches;
  var animations = [];

  function step(sel, delay, duration, easing, from) {
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    var to = { opacity: 1, transform: 'none' };
    if (from.clipPath) to.clipPath = 'inset(0 0 0 0)';
    animations.push(el.animate([Object.assign({ opacity: 0 }, from), to],
      { delay: delay, duration: duration, easing: easing, fill: 'both' }));
  }

  function run() {
    step('.card', 40, 820, ease, { transform: compact ? 'translateY(14px)' : 'translateY(12px) scale(.988)' });
    step('.badge', 120, 480, softEase, { transform: 'translateY(8px)' });
    step('#hl1', 240, 760, ease, { transform: compact ? 'translateY(12px)' : 'translateY(16px)', clipPath: 'inset(100% 0 0 0)' });
    step('#hl2', 330, 760, ease, { transform: compact ? 'translateY(12px)' : 'translateY(16px)', clipPath: 'inset(100% 0 0 0)' });
    step('#h1', 470, 620, ease, { transform: 'translateY(10px)' });
    step('#sub', 570, 560, ease, { transform: 'translateY(10px)' });
    step('#email', 720, 520, softEase, { transform: 'translateY(8px)' });
    step('#pw', 790, 520, softEase, { transform: 'translateY(8px)' });
    step(document.querySelector('#loginBtn, .btn-primary-pill'), 930, 560, ease, { transform: 'translateY(8px)' });
    step('.divider', 1060, 440, softEase, { transform: 'translateY(6px)' });
    step('#gBtn', 1150, 540, ease, { transform: 'translateY(8px)' });
    step('#bottom', 1260, 500, softEase, { transform: 'translateY(6px)' });

    /* The animation layer now owns the hidden first frame, so the CSS
       guard can drop without flashing. */
    document.documentElement.classList.remove('entry-pending');

    Promise.allSettled(animations.map(function (a) { return a.finished; })).then(function () {
      animations.forEach(function (a) { a.cancel(); });
      animations.length = 0;
      releaseEntrance();
    });
  }

  /* Fonts get a chance to land, but a slow font can never stall the page
     past 650ms. */
  Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(function (r) { setTimeout(r, 650); })
  ]).then(function () {
    requestAnimationFrame(function () { requestAnimationFrame(run); });
  });
})();
