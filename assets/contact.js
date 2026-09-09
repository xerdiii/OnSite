/* ───────────────────────────────────────────────────────────────
   Xovah — the contact form

   Posts to /api/contact, which sends through Resend server-side so the
   API key never reaches the browser. RESEND_API_KEY and FROM_EMAIL must
   be set in Vercel; NOTIFY_EMAIL picks the destination.

   With those unset the endpoint replies 503 and the form says plainly
   that nothing was delivered, and hands over the address instead. It
   never shows a tick it has not earned.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var ENDPOINT = '/api/contact';

  var doc = global.document;
  var form = doc.getElementById('contactForm');
  if (!form) return;

  var note = doc.getElementById('contactNote');
  var btn = doc.getElementById('contactSend');

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function say(kind, html) {
    note.className = 'contact-note is-' + kind;
    note.innerHTML = html;
    note.hidden = false;
  }

  function field(name) {
    return form.querySelector('[name="' + name + '"]') ||
           doc.getElementById(name) || null;
  }

  /* Validation stays whatever the markup asks for, plus a real check on
     the two things that make a message useful: who sent it and what
     they said. */
  function validate() {
    var problems = [];
    var email = field('email');
    var message = field('message') || form.querySelector('textarea');

    if (email && !EMAIL.test((email.value || '').trim())) {
      problems.push('a working email address');
      email.setAttribute('aria-invalid', 'true');
    } else if (email) {
      email.removeAttribute('aria-invalid');
    }

    if (message && !(message.value || '').trim()) {
      problems.push('a message');
      message.setAttribute('aria-invalid', 'true');
    } else if (message) {
      message.removeAttribute('aria-invalid');
    }

    return problems;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var problems = validate();
    if (problems.length) {
      say('bad', 'We still need ' + problems.join(' and ') + '.');
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    btn.disabled = true;
    say('info', 'Sending…');

    var payload = {};
    [].forEach.call(form.querySelectorAll('input, textarea, select'), function (el) {
      if (el.name) payload[el.name] = el.value;
    });

    global.fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.ok) {
        form.reset();
        say('good',
          '<strong>Thank you — your message is with us.</strong><br>' +
          'A person reads every enquiry and replies to the address you gave, ' +
          'usually the same working day.');
        return;
      }
      /* 503 means the mail service is not configured; anything else is
         a genuine failure. Either way the message did not arrive, so
         say so and give a route that does work. */
      var alt = 'Please reach us on <a data-wa href="#">WhatsApp</a> or at ' +
                '<a data-mail href="mailto:info@xovahweb.com">info@xovahweb.com</a> instead.';
      say('bad', r.status === 503
        ? '<strong>Sending is temporarily unavailable.</strong><br>Your message was not delivered. ' + alt
        : '<strong>That did not send.</strong><br>Your message was not delivered. ' + alt);
      if (global.XovahContact) global.XovahContact.apply(note);
    }).catch(function () {
      say('bad',
        '<strong>No connection.</strong><br>Your message was not delivered. ' +
        'Please reach us on <a data-wa href="#">WhatsApp</a> or at ' +
        '<a data-mail href="mailto:info@xovahweb.com">info@xovahweb.com</a>.');
      if (global.XovahContact) global.XovahContact.apply(note);
    }).then(function () {
      btn.disabled = false;
    });
  });
})(window);
