/* ───────────────────────────────────────────────────────────────
   Xovah — login, "Signal" composition: the frame

   This sets four custom properties and nothing else:

     --photo-w   the artwork column, eased back as the frame narrows
     --cs        the card's scale factor, which every interior margin
                 in login-signal.css is multiplied by
     --hs        the same for the badge and headline on the artwork
     --band-h    the masthead height in tablet portrait

   It deliberately does NOT position anything. The reference design
   scaled a fixed 613x922 block with inline styles, and account.css
   already records why that was removed: values that only hold at one
   size, and a layout that could latch half-changed on a mode switch.
   Custom properties cannot latch — the stylesheet stays in charge,
   every mode reads the same four numbers, and with JavaScript off the
   fallbacks in the CSS give a correct page.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var body = doc.body;
  if (!body || body.className.indexOf('acct--signal') < 0) return;

  var root = doc.documentElement;

  var REF_W = 1464, PANE_W = 628, CARD_W = 613;
  var CONTENT_H = 697;                    // form block + breathing room
  var IMG_W = 1177, IMG_H = 1336, IMG_REF_SCALE = 836 / 1177;
  var PANE_RATIO = PANE_W / REF_W;
  var HERO_W = 681;
  var RAMP_HI = 1280, RAMP_LO = 1000, PHOTO_MIN = 0.42;
  var RAMP_LO2 = 820, PHOTO_MIN2 = 0.36;

  var mqWide = global.matchMedia('(min-width:1024px)');
  var mqTab = global.matchMedia('(min-width:700px) and (max-width:1023px)');

  /* 57.1% while there is room for it, then handed to the card so the
     form stays legible rather than being squeezed to nothing. */
  function photoRatio(vw) {
    var base = 1 - PANE_RATIO;
    if (vw >= RAMP_HI) return base;
    if (vw >= RAMP_LO) return base + (PHOTO_MIN - base) * ((RAMP_HI - vw) / (RAMP_HI - RAMP_LO));
    if (vw >= RAMP_LO2) return PHOTO_MIN + (PHOTO_MIN2 - PHOTO_MIN) * ((RAMP_LO - vw) / (RAMP_LO - RAMP_LO2));
    return PHOTO_MIN2;
  }

  function set(name, value) { root.style.setProperty(name, value); }
  function clearVars() {
    root.style.removeProperty('--photo-w');
    root.style.removeProperty('--cs');
    root.style.removeProperty('--hs');
    root.style.removeProperty('--band-h');
  }

  function layout() {
    var vw = global.innerWidth, vh = global.innerHeight;

    /* Wipe first. Nothing here is position or size, so a leftover can
       only ever be a stale number — but a stale number is still wrong,
       and clearing costs nothing. */
    clearVars();

    if (mqWide.matches) {
      var ratio = photoRatio(vw);
      var photoW = Math.round(vw * ratio);
      var paneW = vw - photoW;

      set('--photo-w', photoW + 'px');

      /* The same clamp the reference uses: the card tracks whichever
         of width or height runs out first, so the interior never
         overflows a short window. */
      var cs = Math.min(paneW / PANE_W, vh / CONTENT_H);
      set('--cs', String(Math.max(0.62, Math.min(cs, 1.25))));

      /* The hero rides the video's own cover-scale but is never wider
         than the column it sits in. */
      var imgScale = Math.max(photoW / IMG_W, vh / IMG_H);
      var hs = Math.min(imgScale / IMG_REF_SCALE, photoW * 0.92 / HERO_W);
      set('--hs', String(Math.max(0.5, Math.min(hs, 1.1))));
      return;
    }

    if (mqTab.matches) {
      set('--band-h', Math.round(vh * 0.425) + 'px');
      set('--hs', String(Math.max(0.5, Math.min(vw / REF_W * 1.35, 0.92))));
      return;
    }

    /* Phone: deliberately nothing. Every value the phone needs is a
       literal or a clamp() in the stylesheet, so there is no number
       here that could be left behind by a rotation. */
  }

  global.addEventListener('resize', layout, { passive: true });
  global.addEventListener('orientationchange', layout);
  if (mqWide.addEventListener) {
    mqWide.addEventListener('change', layout);
    mqTab.addEventListener('change', layout);
  } else if (mqWide.addListener) {
    mqWide.addListener(layout);
    mqTab.addListener(layout);
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
  layout();
})(window);
