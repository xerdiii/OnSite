/* ───────────────────────────────────────────────────────────────
   Xovah — how customers reach us

   ══ THE ONLY FILE YOU EDIT TO CHANGE A CONTACT CHANNEL ══════════

   Change a number or a handle here and every button on every page
   follows. Nothing else needs touching.

     WHATSAPP          digits only, country code first, no + and no
                       spaces — that is the format wa.me requires.
     WHATSAPP_DISPLAY  how the same number is shown to a human.
     INSTAGRAM         full profile URL. Leave it '' and every
                       Instagram button removes itself from the page
                       rather than linking somewhere that does not
                       exist.
     EMAIL             where the contact form and mailto links go.

   ════════════════════════════════════════════════════════════════ */
window.XOVAH_CONTACT = {
  WHATSAPP: '38345403334',
  WHATSAPP_DISPLAY: '+383 45 403 334',
  INSTAGRAM: 'https://instagram.com/xovahweb',
  EMAIL: 'info@xovahweb.com'
};

/* ── The runtime ────────────────────────────────────────────────
   Markup asks for a channel with an attribute and this fills in the
   destination, so no page hard-codes a number:

     <a data-wa>            → opens WhatsApp
     <a data-wa="Hello">    → opens WhatsApp with the message prefilled
     <a data-ig>            → opens Instagram, or is removed if unset
     <a data-mail>          → mailto:
     <span data-wa-display> → the number, written out

   Kept as a plain IIFE with var and no build step, like the rest of
   assets/. It runs on DOMContentLoaded and again on demand, so markup
   added later (the dock, the mobile menu) can call it too. */
(function (global) {
  'use strict';

  var doc = global.document;

  function cfg() {
    return global.XOVAH_CONTACT || {};
  }

  function waHref(prefill) {
    var c = cfg();
    if (!c.WHATSAPP) return '';
    var url = 'https://wa.me/' + String(c.WHATSAPP).replace(/[^\d]/g, '');
    return prefill ? url + '?text=' + encodeURIComponent(prefill) : url;
  }

  function apply(root) {
    var scope = root || doc;
    var c = cfg();

    [].forEach.call(scope.querySelectorAll('[data-wa]'), function (el) {
      var href = waHref(el.getAttribute('data-wa'));
      if (!href) { el.remove(); return; }
      el.setAttribute('href', href);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });

    /* Whole blocks — a heading plus its link — disappear together, so
       an unconfigured channel never leaves a label with nothing under
       it. Run before [data-ig] so the link inside is already gone. */
    if (!c.INSTAGRAM) {
      [].forEach.call(scope.querySelectorAll('[data-ig-block]'), function (el) {
        el.remove();
      });
    }

    [].forEach.call(scope.querySelectorAll('[data-ig]'), function (el) {
      /* No handle configured means no button. A dead link to a profile
         that does not exist is worse than no link at all. */
      if (!c.INSTAGRAM) { el.remove(); return; }
      el.setAttribute('href', c.INSTAGRAM);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });

    [].forEach.call(scope.querySelectorAll('[data-mail]'), function (el) {
      if (!c.EMAIL) return;
      var subject = el.getAttribute('data-mail');
      el.setAttribute('href', 'mailto:' + c.EMAIL + (subject ? '?subject=' + encodeURIComponent(subject) : ''));
    });

    [].forEach.call(scope.querySelectorAll('[data-wa-display]'), function (el) {
      if (c.WHATSAPP_DISPLAY) el.textContent = c.WHATSAPP_DISPLAY;
    });

    [].forEach.call(scope.querySelectorAll('[data-mail-display]'), function (el) {
      if (c.EMAIL) el.textContent = c.EMAIL;
    });
  }

  global.XovahContact = { apply: apply, waHref: waHref };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})(window);
