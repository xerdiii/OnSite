/* ───────────────────────────────────────────────────────────────
   Xovah — the project request in the home page extras section
   (markup in index.html #extras, styles in assets/devices.css)

   Step 1: four questions, each needs an answer.
   Step 2: name and email (both needed to reply), an optional note.
   Sending posts to /api/contact in the shape the plain contact form
   uses, so it arrives in the same inbox. If mail is not configured
   (503) or anything else fails, the form says so and keeps what was
   typed rather than pretending it was sent.
   ─────────────────────────────────────────────────────────────── */
(function () {
  var form = document.getElementById('rq');
  if (!form) return;

  var ENDPOINT = '/api/contact';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var QUESTIONS = ['package', 'budget', 'timeline', 'type'];

  var pages = form.querySelectorAll('[data-rq-page]');
  var stepText = form.querySelector('[data-rq-step]');
  var submit = form.querySelector('button[type="submit"]');

  function show(n) {
    Array.prototype.forEach.call(pages, function (p) {
      p.hidden = p.getAttribute('data-rq-page') !== String(n);
    });
    stepText.textContent = n === 3 ? 'Sent' : 'Step ' + n + ' of 2';
    form.scrollTop = 0;
  }

  function error(n, text) {
    form.querySelector('[data-rq-error="' + n + '"]').textContent = text || '';
  }

  function value(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  /* ── Step 1 ── */
  form.querySelector('[data-rq-next]').addEventListener('click', function () {
    var missing = QUESTIONS.filter(function (q) {
      var set = form.querySelector('[data-q="' + q + '"]');
      var empty = !value(q);
      set.classList.toggle('is-missing', empty);
      return empty;
    });
    if (missing.length) {
      error(1, 'Choose an answer for each question.');
      return;
    }
    error(1);
    show(2);
    form.querySelector('#rq-name').focus({ preventScroll: true });
  });

  // an answer clears that question's warning
  form.addEventListener('change', function (e) {
    var set = e.target.closest('[data-q]');
    if (set) set.classList.remove('is-missing');
    if (!form.querySelector('.rq-card.is-missing')) error(1);
  });

  form.querySelector('[data-rq-back]').addEventListener('click', function () {
    error(2);
    show(1);
  });

  /* ── Step 2: send ── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var note = form.elements.note.value.trim();

    form.elements.name.classList.toggle('is-missing', !name);
    form.elements.email.classList.toggle('is-missing', !EMAIL.test(email));
    if (!name) return error(2, 'Add your name so we know who to reply to.');
    if (!EMAIL.test(email)) return error(2, 'Enter a valid email address.');
    error(2);

    /* What lands in the inbox. Written as a short briefing rather than
       four bare values, so it can be read on a phone and answered
       without opening anything else. */
    var lines = [
      name + ' wants a website.',
      '',
      'Package they picked:  ' + value('package'),
      'Budget:               ' + value('budget'),
      'They need it:         ' + value('timeline'),
      'Type of website:      ' + value('type'),
      '',
      note ? 'In their words:' : 'They did not add a note.',
    ];
    if (note) lines.push(note);
    lines.push('', 'Reply to ' + name + ' at ' + email + '.',
               'Sent from the request form on the home page.');

    submit.disabled = true;
    submit.textContent = 'Sending…';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        service: 'Website project request (' + value('package') + ')',
        budget: value('budget'),
        message: lines.join('\n'),
        company: form.elements.company.value
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        form.querySelector('[data-rq-done-text]').textContent =
          'Thanks, ' + name + '. Your request is with us — we read every one and '
          + 'reply to ' + email + ', usually the same working day.';
        show(3);
      })
      .catch(function (err) {
        error(2, err.message === '429'
          ? 'Too many attempts. Wait a minute and try again.'
          : 'Your request could not be sent. Try again, or use the contact page.');
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = 'Send request';
      });
  });

  form.querySelector('[data-rq-reset]').addEventListener('click', function () {
    form.reset();
    show(1);
  });
})();
