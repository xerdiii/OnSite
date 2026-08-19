/* ───────────────────────────────────────────────────────────────
   Onsite — shared site footer
   Injected into <div data-site-footer></div> so every page carries the
   same navigation, policy links and contact block.

   The [SQUARE BRACKET] items are deliberate placeholders. They must be
   replaced with the real registered details before taking customers —
   nothing here is invented.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

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
    '.ft-dot{width:0.75rem;height:0.75rem;border-radius:0.125rem;background:#11a05f;display:block}' +
    '.ft-base{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.2);' +
      'display:flex;flex-wrap:wrap;gap:1rem 1.5rem;align-items:center;justify-content:space-between}' +
    '.ft-base p{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.6875rem;' +
      'letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5)}' +
    '.ft-btn{background:none;border:0;padding:0;font:inherit;font-size:0.875rem;' +
      'color:rgba(255,255,255,0.78);cursor:pointer;text-align:left}' +
    '.ft-btn:hover{color:#FFFFFF}' +
    '.ft a:focus-visible,.ft-btn:focus-visible{outline:2px solid #FFFFFF;outline-offset:3px;border-radius:2px}';

  function html() {
    return '' +
    '<div class="ft-in">' +
      '<div class="ft-grid">' +

        '<div>' +
          '<a href="index.html" class="ft-mark"><span class="ft-dot"></span><h2>Onsite</h2></a>' +
          '<p class="ft-blurb">Professional business websites, built and managed for local businesses. ' +
            'One-time build price, optional monthly services, and a payment schedule you can read in full ' +
            'before you pay anything.</p>' +
        '</div>' +

        '<div>' +
          '<p class="ft-label">Product</p>' +
          '<div class="ft-list">' +
            '<a href="index.html#pricing">Products &amp; pricing</a>' +
            '<a href="faq.html">FAQ</a>' +
            '<a href="start.html">What we need from you</a>' +
            '<a href="login.html">Client dashboard</a>' +
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
          '<p class="ft-label">Contact</p>' +
          '<div class="ft-contact">' +
            '<a href="contact.html">Contact us</a>' +
            '<span class="ft-ph">[LEGAL BUSINESS NAME]</span>' +
            '<span class="ft-ph">[REGISTERED BUSINESS ADDRESS]</span>' +
            '<span class="ft-ph">[CONTACT EMAIL]</span>' +
            '<span class="ft-ph">[SUPPORT EMAIL]</span>' +
            '<span class="ft-ph">[PHONE NUMBER]</span>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="ft-base">' +
        '<p>[REGISTRATION NUMBER IF APPLICABLE] · [TAX/VAT INFORMATION IF APPLICABLE]</p>' +
        '<p>Demo build — payments and sign-in are simulated</p>' +
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
