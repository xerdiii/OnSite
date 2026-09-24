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
      'display:flex;flex-wrap:wrap;gap:0.9rem 1.75rem;align-items:center}' +
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
        '<a class="ft-social" href="mailto:hello@xovahweb.com">' + MAIL + '<span>hello@xovahweb.com</span></a>' +
        '<a class="ft-social" href="https://instagram.com/xovahweb" target="_blank" rel="me noopener noreferrer">' +
          IG + '<span>@xovahweb</span>' +
        '</a>' +
        '<a class="ft-social" href="https://www.facebook.com/share/1BxVCY7V2S/" target="_blank" rel="me noopener noreferrer">' +
          FB + '<span>Facebook</span>' +
        '</a>' +
        // wa.me wants the number bare: no +, no spaces.
        '<a class="ft-social" href="https://wa.me/38345681529" target="_blank" rel="noopener noreferrer">' +
          WA + '<span>+383 45 681 529</span>' +
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

  /* Drawn rather than fetched: one more file for one 20px glyph is not
     a trade worth making. */
  var IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
    '<circle cx="12" cy="12" r="4"/>' +
    '<circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>';

  var FB = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.89 3.77-3.89 ' +
    '1.1 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99' +
    'A10 10 0 0022 12z"/></svg>';

  var WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38' +
    'a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 ' +
    '18.15h-.01a8.23 8.23 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38' +
    'c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 018.24 8.24c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16' +
    'c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06' +
    '-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29' +
    '.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42' +
    '-.56-.42l-.48-.01c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.04s.87 2.37 1 2.53c.12.16 1.72 ' +
    '2.62 4.16 3.68.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21' +
    '-1.07.15-1.18-.06-.11-.22-.17-.47-.29z"/></svg>';

  var MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';

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
