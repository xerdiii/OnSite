/* ───────────────────────────────────────────────────────────────
   Xovah — the request on the extras page

   Everything ticked in the picker above is written into the message as
   it is ticked, so what arrives in the inbox is exactly what was on
   screen: the extras, their prices, the total, and the few words about
   the business. It posts to /api/contact, the same endpoint the
   contact form uses.

   Photos are asked for as a link rather than an upload. A phone photo
   is three to eight megabytes and six of them will not survive a
   serverless request body — a Drive or WeTransfer link always will,
   and the ones who have nothing to link can send them by reply.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var form = doc.getElementById('exq');
  if (!form) return;

  var ENDPOINT = '/api/contact';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var preview = doc.querySelector('[data-exq-preview]');
  var errorEl = doc.querySelector('[data-exq-error]');
  var done = doc.querySelector('[data-exq-done]');
  var doneText = doc.querySelector('[data-exq-done-text]');
  var submit = form.querySelector('button[type="submit"]');

  /* If the endpoint cannot send — mail unconfigured on the host, a
     network that dropped — the request must not die in the browser.
     The same list is handed to the visitor's own mail app, addressed
     to the inbox this form posts to, so nothing is lost either way.
     Ten lines repeated in extras.js rather than a shared file: a
     shared file is a script tag on every generated page in ten
     languages, which is the larger cost of the two. */
  var INBOX = 'hello@xovahweb.com';

  function offerMail(el, subject, body) {
    el.textContent = 'Your request could not be sent from the site. ';
    var a = doc.createElement('a');
    // Long mailto: bodies are truncated by Windows and by some mail
    // apps, so this stays well under the length that survives anywhere.
    a.href = 'mailto:' + INBOX
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(String(body).slice(0, 1400));
    a.className = 'underline';
    a.textContent = 'Send it as an email instead';
    el.appendChild(a);
    el.appendChild(doc.createTextNode(' — it reaches us at ' + INBOX + '.'));
  }

  function money(n) {
    var c = Math.round(n * 100) / 100;
    if (global.SitehouseI18n) return global.SitehouseI18n.format(c);
    return '€' + (c % 1 === 0 ? c : c.toFixed(2));
  }

  /* What is ticked, read from the page rather than from storage: the
     page is the thing the visitor can see. */
  function picked() {
    var out = [];
    [].forEach.call(doc.querySelectorAll('.pick-cb'), function (b) {
      if (!b.checked) return;
      var label = b.parentNode;
      var name = label.querySelector('.pick-name');
      var price = label.querySelector('.pick-price');
      out.push({
        name: name ? name.textContent.trim() : b.getAttribute('data-pick'),
        price: price ? price.textContent.trim() : '',
        value: parseFloat(b.getAttribute('data-price')) || 0,
      });
    });
    return out;
  }

  function total(list) {
    return list.reduce(function (n, x) { return n + x.value; }, 0);
  }

  function lines() {
    var list = picked();
    var out = [];
    var f = form.elements;

    out.push(list.length
      ? 'Extras chosen (' + list.length + '):'
      : 'No extras ticked yet — this is a request for the website itself.');
    list.forEach(function (x) { out.push('  · ' + x.name + (x.price ? ' — ' + x.price : '')); });
    if (list.length) out.push('', 'Extras total (estimate): ' + money(total(list)));

    var about = [];
    if (f.business.value.trim()) about.push('Business: ' + f.business.value.trim());
    if (f.kind.value.trim()) about.push('Website type: ' + f.kind.value.trim());
    if (f.photos.value.trim()) about.push('Photos and logo: ' + f.photos.value.trim());
    if (about.length) out.push('', about.join('\n'));

    if (f.brief.value.trim()) out.push('', 'In their words:', f.brief.value.trim());
    out.push('', 'Sent from the extras page.');
    return out.join('\n');
  }

  function draw() {
    if (!preview) return;
    preview.textContent = lines();
  }

  doc.addEventListener('change', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('pick-cb')) draw();
  });
  form.addEventListener('input', draw);
  if (global.SitehouseI18n) global.SitehouseI18n.onChange(draw);
  draw();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var email = f.email.value.trim();
    var name = f.name.value.trim();

    f.name.classList.toggle('is-missing', !name);
    f.email.classList.toggle('is-missing', !EMAIL.test(email));
    if (!name) { errorEl.textContent = 'Add your name so we know who to reply to.'; return; }
    if (!EMAIL.test(email)) { errorEl.textContent = 'Enter a valid email address.'; return; }
    errorEl.textContent = '';

    var list = picked();
    submit.disabled = true;
    submit.textContent = 'Sending…';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        business: f.business.value.trim(),
        service: 'Extras request (' + list.length + ' selected)',
        budget: list.length ? money(total(list)) + ' of extras' : '',
        message: name + ' built a list on the extras page.\n\n' + lines(),
        company: f.company.value,
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        doneText.textContent = 'Thanks, ' + name + '. We will reply to ' + email
          + ', usually the same working day.';
        form.hidden = true;
        done.hidden = false;
        done.scrollIntoView({ block: 'center', behavior: 'smooth' });
      })
      .catch(function (err) {
        if (err.message === '429') {
          errorEl.textContent = 'Too many attempts. Wait a minute and try again.';
          return;
        }
        offerMail(
          errorEl,
          'Website request — ' + (f.business.value.trim() || name),
          name + ' built a list on the extras page.\n\n' + lines()
            + '\n\nReply to ' + email + '.'
        );
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = 'Send my request';
      });
  });
})(window);
