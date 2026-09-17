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
    '.ft-in{max-width:76rem;margin:0 auto;padding:3rem 1.5rem clamp(4rem,14vw,11rem)}' +
    '@media(min-width:768px){.ft-in{padding:3.5rem 2.5rem clamp(4rem,12vw,12rem)}}' +
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
      'background:url("/assets/brand/xovah-mark-v2.png") center/contain no-repeat}' +
    '.ft-base{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.2);' +
      'display:flex;flex-wrap:wrap;gap:1rem 1.5rem;align-items:center;justify-content:space-between}' +
    '.ft-base p{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.6875rem;' +
      'letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5)}' +
    '.ft-social{display:inline-flex;align-items:center;gap:0.55rem;' +
      'font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.75rem;letter-spacing:0.08em;' +
      'color:rgba(255,255,255,0.72);text-decoration:none;transition:color 180ms ease}' +
    '.ft-social svg{width:18px;height:18px;display:block}' +
    '.ft-social:hover{color:#FFFFFF}' +
    '.ft-btn{background:none;border:0;padding:0;font:inherit;font-size:0.875rem;' +
      'color:rgba(255,255,255,0.78);cursor:pointer;text-align:left}' +
    '.ft-btn:hover{color:#FFFFFF}' +
    '.ft a:focus-visible,.ft-btn:focus-visible{outline:2px solid #FFFFFF;outline-offset:3px;border-radius:2px}' +

    /* The sign-off: XOVAHWEB as a quiet watermark behind the footer. The
       same extruded, receding word as before, but dim, low-contrast and
       cropped by the foot of the page, so it reads as texture behind the
       links rather than as a thing competing with them. Decorative; the
       name is already in the footer. */
    '.ft{position:relative;overflow:hidden}' +
    '.ft-in{position:relative;z-index:1}' +
    '.ft-word{position:absolute;left:0;right:0;bottom:0;z-index:0;pointer-events:none;' +
      '-webkit-user-select:none;user-select:none;opacity:0.2;transform:translateY(16%)}' +
    '.ft-word-stage{perspective:105vw;perspective-origin:0% 50%;padding-left:clamp(1rem,2.5vw,3rem)}' +
    '.ft-word-tilt{position:relative;display:inline-block;transform-origin:0% 60%;' +
      'transform:rotateY(18deg);font-family:Outfit,Inter,"Helvetica Neue",Arial,sans-serif;' +
      'font-weight:800;font-size:clamp(3rem,24vw,30rem);line-height:0.82;letter-spacing:-0.045em;white-space:nowrap}' +
    '.ft-word-depth{display:block;color:#2a0508;' +
      'text-shadow:0.008em 0.006em 0 #33060a,0.016em 0.012em 0 #2a0508,0.024em 0.018em 0 #210406}' +
    '.ft-word-face{position:absolute;inset:0;display:block;' +
      'background:linear-gradient(180deg,#e0303a 0%,#a8121b 55%,#4a070b 100%);' +
      '-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;' +
      'filter:drop-shadow(0 0 0.12em rgba(217,35,46,0.35))}' +
    /* light mode: the footer is still ink, so the watermark stays the same */
    '';

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
            '<a href="extras.html">Start a project</a>' +
            '<a href="pricing.html">Packages &amp; prices</a>' +
            '<a href="extras.html">Extras &amp; add-ons</a>' +
            '<a href="contact.html">Contact</a>' +
            '<span>Xovah</span>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="ft-base">' +
        '<a class="ft-social" href="https://instagram.com/xovahweb" target="_blank" rel="me noopener noreferrer">' +
          IG + '<span>@xovahweb</span>' +
        '</a>' +
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

  /* Instagram, drawn rather than fetched: one more file for one 20px
     glyph is not a trade worth making. */
  var IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
    '<circle cx="12" cy="12" r="4"/>' +
    '<circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>';

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
