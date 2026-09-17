/* ───────────────────────────────────────────────────────────────
   Xovah — shared site footer
   Injected into <div data-site-footer></div> so every page carries the
   same navigation, policy links and contact block.

   The [SQUARE BRACKET] items are deliberate placeholders. They must be
   replaced with the real registered details before taking customers —
   nothing here is invented.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  // Cut from the original artwork, in white because the footer is ink.
  var MARK = '<span class="ft-dot" role="img" aria-label="Xovah"></span>';

  var doc = global.document;

  var STYLES = '' +
    '.ft{background:#14161A;color:#FFFFFF}' +
    '.ft-in{max-width:76rem;margin:0 auto;padding:3rem 1.5rem 2rem}' +
    '@media(min-width:768px){.ft-in{padding:3.5rem 2.5rem 2rem}}' +
    '.ft-grid{display:grid;grid-template-columns:1fr;gap:2.5rem}' +
    '@media(min-width:640px){.ft-grid{grid-template-columns:1fr 1fr}}' +
    '@media(min-width:1024px){.ft-grid{grid-template-columns:1.4fr 1fr 1fr 1.3fr}}' +
    '.ft h2{font-family:Inter,"Helvetica Neue",Arial,sans-serif;font-weight:600;font-size:1rem;' +
      'letter-spacing:-0.02em;color:#FFFFFF}' +
    '.ft-label{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.6875rem;' +
      'letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55)}' +
    '.ft-list{margin-top:1rem;display:flex;flex-direction:column;gap:0.55rem}' +
    '.ft a{color:rgba(255,255,255,0.78);font-size:0.875rem;text-decoration:none}' +
    '.ft a:hover{color:#FFFFFF}' +
    '.ft-blurb{margin-top:0.9rem;font-size:0.8125rem;line-height:1.6;color:rgba(255,255,255,0.7);max-width:22rem}' +
    '.ft-contact{margin-top:1rem;display:flex;flex-direction:column;gap:0.5rem;font-size:0.8125rem;' +
      'line-height:1.5;color:rgba(255,255,255,0.7)}' +
    '.ft-ph{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.75rem;letter-spacing:0.04em;' +
      'color:rgba(255,255,255,0.5);border:1px dashed rgba(255,255,255,0.25);border-radius:0.25rem;' +
      'padding:0.3rem 0.5rem;display:inline-block}' +
    '.ft-mark{display:flex;align-items:center;gap:0.6rem}' +
    /* This sheet is injected into the document head, so the URL resolves
       against the page rather than against assets/ — it needs the full
       path where the real stylesheets need only "brand/". */
    '.ft-dot{width:1.792rem;height:1.35rem;flex:none;display:block;' +
      'background:url("assets/brand/xovah-mark-v2.png") center/contain no-repeat}' +
    '.ft-base{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.2);' +
      'display:flex;flex-wrap:wrap;gap:1rem 1.5rem;align-items:center;justify-content:space-between}' +
    '.ft-base p{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.6875rem;' +
      'letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5)}' +
    '.ft-btn{background:none;border:0;padding:0;font:inherit;font-size:0.875rem;' +
      'color:rgba(255,255,255,0.78);cursor:pointer;text-align:left}' +
    '.ft-btn:hover{color:#FFFFFF}' +
    '.ft a:focus-visible,.ft-btn:focus-visible{outline:2px solid #FFFFFF;outline-offset:3px;border-radius:2px}' +

    /* The sign-off: XOVAHWEB as a lit, extruded wordmark receding to the
       right, standing on a dark floor that reflects it. Pure CSS — two
       stacked copies of the word (a dark extrusion and a gradient face), a
       glow, and a reflection. Decorative; the name is already in the footer. */
    '.ft-word{position:relative;overflow:hidden;margin-top:2.5rem;padding:1.5rem 0 3.2rem;' +
      'background:radial-gradient(70% 90% at 22% 100%,rgba(217,35,46,0.28),rgba(217,35,46,0) 70%),' +
      'linear-gradient(180deg,#14161A 0%,#0a0a0b 100%);' +
      '-webkit-user-select:none;user-select:none;pointer-events:none}' +
    '.ft-word-stage{perspective:105vw;perspective-origin:0% 50%;padding-left:clamp(1rem,2.5vw,3rem)}' +
    '.ft-word-tilt{position:relative;display:inline-block;transform-origin:0% 60%;' +
      'transform:rotateY(18deg);font-family:Outfit,Inter,"Helvetica Neue",Arial,sans-serif;' +
      'font-weight:800;font-size:clamp(3rem,24vw,30rem);line-height:0.82;letter-spacing:-0.045em;white-space:nowrap}' +
    /* extrusion: the same word, solid dark crimson, stepped back and down */
    '.ft-word-depth{display:block;color:#3b060a;' +
      'text-shadow:0.006em 0.004em 0 #4a080d,0.012em 0.008em 0 #43070c,0.018em 0.012em 0 #3b060a,' +
      '0.024em 0.016em 0 #330509,0.03em 0.02em 0 #2a0407,0.036em 0.024em 0 #210306}' +
    /* face: lit from the upper left, a hot edge along the top of each letter */
    '.ft-word-face{position:absolute;inset:0;display:block;' +
      'background:linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,196,196,0.55) 45%,rgba(255,255,255,0) 60%),' +
      'linear-gradient(180deg,#ff5a61 0%,#e32a35 26%,#b8121c 62%,#6c0a10 100%);' +
      'background-size:250% 100%,100% 100%;background-position:120% 0,0 0;' +
      '-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;' +
      'filter:drop-shadow(0 0 0.06em rgba(255,40,52,0.55)) drop-shadow(0 0 0.28em rgba(217,35,46,0.35));' +
      'animation:ft-sheen 9s cubic-bezier(0.45,0,0.2,1) infinite}' +
    '@keyframes ft-sheen{0%,55%{background-position:120% 0,0 0}100%{background-position:-60% 0,0 0}}' +
    /* the floor: a faint mirror of the word, and a thin red horizon of light */
    '@supports (-webkit-box-reflect:below 0){.ft-word-tilt{-webkit-box-reflect:below -0.1em ' +
      'linear-gradient(transparent 62%,rgba(255,255,255,0.16))}}' +
    '.ft-word::after{content:"";position:absolute;left:0;right:0;bottom:2.4rem;height:1px;' +
      'background:linear-gradient(90deg,rgba(255,60,70,0) 0%,rgba(255,60,70,0.85) 18%,rgba(255,60,70,0.25) 70%,rgba(255,60,70,0) 100%);' +
      'box-shadow:0 0 18px 2px rgba(217,35,46,0.45)}' +
    '@media (prefers-reduced-motion:reduce){.ft-word-face{animation:none}}';

  function html() {
    return '' +
    '<div class="ft-in">' +
      '<div class="ft-grid">' +

        '<div>' +
          '<a href="./" class="ft-mark">' + MARK + '<h2>Xovah</h2></a>' +
          '<p class="ft-blurb">Professional business websites, built and managed for local businesses. ' +
            'One-time build price, and a payment schedule you can read in full before you pay anything.</p>' +
        '</div>' +

        '<div>' +
          '<p class="ft-label">Product</p>' +
          '<div class="ft-list">' +
            '<a href="./#pricing">Products &amp; pricing</a>' +
            '<a href="faq.html">FAQ</a>' +
            '<a href="extras.html">Extras &amp; add-ons</a>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<p class="ft-label">Policies</p>' +
          '<div class="ft-list">' +
            '<a href="terms.html">Terms of Service</a>' +
            '<a href="privacy.html">Privacy Policy</a>' +
            '<a href="cookies.html">Cookie Policy</a>' +
            '<a href="refunds.html">Cancellation &amp; Refund Policy</a>' +
            '<button class="ft-btn" data-cookie-settings type="button">Cookie settings</button>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<p class="ft-label">Get started</p>' +
          '<div class="ft-contact">' +
            '<a href="start.html">Start a project</a>' +
            '<a href="pricing.html">Packages &amp; prices</a>' +
            '<a href="extras.html">Extras &amp; add-ons</a>' +
            '<a href="support.html">Help &amp; support</a>' +
            '<span>Xovah</span>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="ft-base">' +
                '<p>We agree every price with you before any payment.</p>' +
      '</div>' +
    '</div>' +
    '<div class="ft-word" aria-hidden="true">' +
      '<div class="ft-word-stage">' +
        '<span class="ft-word-tilt">' +
          '<span class="ft-word-depth">XOVAHWEB</span>' +
          '<span class="ft-word-face">XOVAHWEB</span>' +
        '</span>' +
      '</div>' +
    '</div>';
  }

  function mount() {
    var slot = doc.querySelector('[data-site-footer]');
    if (!slot) return;

    if (!doc.getElementById('ft-styles')) {
      var style = doc.createElement('style');
      style.id = 'ft-styles';
      style.textContent = STYLES;
      doc.head.appendChild(style);
    }

    var footer = doc.createElement('footer');
    footer.className = 'ft';
    footer.innerHTML = html();
    slot.parentNode.replaceChild(footer, slot);

  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(window);
