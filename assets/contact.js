/* ───────────────────────────────────────────────────────────────
   Xovah — the contact form

   ══ TODO: CONNECT RESEND HERE ═══════════════════════════════════
   ENDPOINT is null on purpose. Nothing is being sent yet, and the
   form says so rather than showing a green tick it has not earned.

   To connect it:
     Live. The form posts to /api/contact.mjs, which sends through
   Resend server-side. Set RESEND_API_KEY and FROM_EMAIL in Vercel to
   turn it on; NOTIFY_EMAIL chooses the destination and defaults to the
   owner's Gmail. Unset, the endpoint replies 503 and the form says
   plainly that nothing was delivered.
   ════════════════════════════════════════════════════════════════ */
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

    if (!ENDPOINT) {
      /* Honest, not fake. The message has not gone anywhere, so it does
         not claim to have — it hands over the address instead. */
      say('info',
        'Sending is not switched on yet, so this has <strong>not</strong> been delivered. ' +
        'Email <a href="mailto:info@xovahweb.com">info@xovahweb.com</a> and we will pick it up — ' +
        'or open a thread in <a href="support.html">Help &amp; support</a>.');
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
        say('good', 'Sent. A person reads every message — you will hear back, usually the same day.');
      } else {
        say('bad',
          'That did not send. Email <a href="mailto:info@xovahweb.com">info@xovahweb.com</a> ' +
          'instead and it will reach the same place.');
      }
    }).catch(function () {
      say('bad',
        'No connection. Email <a href="mailto:info@xovahweb.com">info@xovahweb.com</a> instead.');
    }).then(function () {
      btn.disabled = false;
    });
  });
})(window);
