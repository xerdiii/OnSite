/* ───────────────────────────────────────────────────────────────
   Sitehouse — the free landing page form

   Validation happens on the field, next to the field, and only after
   someone has actually left it — telling people they are wrong while
   they are still typing is noise, and a list of errors at the top of a
   long form is worse.

   The Google Maps link is the one field worth being strict about. A
   typed address gets geocoded to the middle of a street; a Maps share
   link carries the exact pin, which is the difference between a
   customer arriving and a customer giving up.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var form = doc.getElementById('freeForm');
  if (!form) return;

  var MAX_IMAGES = 3;
  var MAX_IMAGE_MB = 8;
  var MAX_VIDEO_MB = 60;

  /* Every host Google hands out from the Share sheet, plus the long
     form you get from the address bar. */
  var MAPS = /^(https?:\/\/)?(www\.)?(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+\/maps)/i;
  var SOCIAL = /^(https?:\/\/)?(www\.)?[a-z0-9-]+\.[a-z]{2,}(\/|$)/i;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function err(id, message) {
    var field = doc.getElementById(id);
    var box = doc.querySelector('[data-err-for="' + id + '"]');
    if (!box) return;
    if (message) {
      box.textContent = message;
      box.hidden = false;
      if (field) field.setAttribute('aria-invalid', 'true');
    } else {
      box.hidden = true;
      if (field) field.removeAttribute('aria-invalid');
    }
  }

  var RULES = {
    'ff-name': function (v) {
      if (!v.trim()) return 'We need the name customers know you by.';
      if (v.trim().length < 2) return 'That looks too short to be the name.';
      return '';
    },
    'ff-maps': function (v) {
      if (!v.trim()) return 'Paste the Google Maps link so the map lands on your door.';
      if (!MAPS.test(v.trim())) {
        return 'That is not a Google Maps link. Open Maps, press Share, then Copy link.';
      }
      return '';
    },
    'ff-phone': function (v) {
      if (!v.trim()) return 'The call button needs a number.';
      if (v.replace(/[^\d]/g, '').length < 6) return 'That number looks incomplete.';
      return '';
    },
    'ff-social': function (v) {
      if (!v.trim()) return 'One link — Instagram, Facebook, TikTok, whichever you actually use.';
      if (!SOCIAL.test(v.trim())) return 'That does not look like a web address.';
      return '';
    },
    'ff-email': function (v) {
      if (!v.trim()) return 'We send the finished page here.';
      if (!EMAIL.test(v.trim())) return 'Check that address — it is missing something.';
      return '';
    },
    'ff-pw': function (v) {
      if (!v) return 'Pick a password so you can get back in.';
      if (v.length < 8) return 'Eight characters or more.';
      return '';
    }
  };

  function check(id) {
    var el = doc.getElementById(id);
    if (!el || !RULES[id]) return true;
    var message = RULES[id](el.value);
    err(id, message);
    return !message;
  }

  Object.keys(RULES).forEach(function (id) {
    var el = doc.getElementById(id);
    if (!el) return;
    // Validate on leaving the field; once it is wrong, correct live so
    // the message disappears the moment it stops being true.
    el.addEventListener('blur', function () { check(id); });
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid') === 'true') check(id);
    });
  });

  /* ── Files ──────────────────────────────────────────────── */
  function mb(bytes) { return (bytes / 1048576).toFixed(1) + ' MB'; }

  function listFiles(inputId, max, maxMb, label) {
    var input = doc.getElementById(inputId);
    var list = doc.querySelector('[data-files="' + inputId + '"]');
    if (!input || !list) return;

    input.addEventListener('change', function () {
      var files = [].slice.call(input.files || []);
      var problem = '';

      if (files.length > max) {
        problem = max === 1 ? 'One video, please.' : 'Three photos at most — the first three are kept.';
        files = files.slice(0, max);
      }
      var over = files.filter(function (f) { return f.size > maxMb * 1048576; });
      if (over.length) problem = label + ' over ' + maxMb + ' MB will not send. Try a smaller one.';

      err(inputId, problem);
      list.innerHTML = files.map(function (f) {
        return '<li><b>' + f.name.replace(/[<>&]/g, '') + '</b><span>' + mb(f.size) + '</span></li>';
      }).join('');
    });

    /* Drag and drop onto the box, since the input already covers it. */
    var drop = input.closest('[data-drop]');
    if (!drop) return;
    ['dragenter', 'dragover'].forEach(function (e) {
      drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (e) {
      drop.addEventListener(e, function () { drop.classList.remove('is-over'); });
    });
  }

  listFiles('ff-images', MAX_IMAGES, MAX_IMAGE_MB, 'Photos');
  listFiles('ff-video', 1, MAX_VIDEO_MB, 'Videos');

  /* ── Opening hours ──────────────────────────────────────── */
  function hoursRows() { return [].slice.call(doc.querySelectorAll('[data-hrow]')); }

  hoursRows().forEach(function (row) {
    var input = row.querySelector('[data-hours]');
    var shut = row.querySelector('[data-shut]');
    shut.addEventListener('click', function () {
      var closed = row.classList.toggle('is-shut');
      shut.setAttribute('aria-pressed', closed ? 'true' : 'false');
      // Remember what they had typed, so un-closing a day gives it back
      // instead of making them type the times again.
      if (closed) { input.dataset.was = input.value; input.value = 'Closed'; input.readOnly = true; }
      else { input.value = input.dataset.was || '09:00 – 17:00'; input.readOnly = false; }
    });
  });

  var applyAll = doc.querySelector('[data-hours-all]');
  if (applyAll) {
    applyAll.addEventListener('click', function () {
      var rows = hoursRows();
      var first = rows[0];
      var value = first.querySelector('[data-hours]').value;
      var closed = first.classList.contains('is-shut');
      rows.slice(1).forEach(function (row) {
        var input = row.querySelector('[data-hours]');
        var shut = row.querySelector('[data-shut]');
        input.value = value;
        input.readOnly = closed;
        row.classList.toggle('is-shut', closed);
        shut.setAttribute('aria-pressed', closed ? 'true' : 'false');
      });
      applyAll.textContent = 'Copied to every day';
      global.setTimeout(function () { applyAll.textContent = 'Use Monday for every day'; }, 1800);
    });
  }

  function readHours() {
    return hoursRows().map(function (row) {
      return { day: row.querySelector('.hours-day').textContent,
               open: row.querySelector('[data-hours]').value.trim() || 'Closed' };
    });
  }

  /* ── Submit ─────────────────────────────────────────────── */
  var formErr = doc.getElementById('ffErr');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var order = Object.keys(RULES);
    var bad = order.filter(function (id) { return !check(id); });

    if (!doc.getElementById('ff-agree').checked) {
      formErr.textContent = 'Please agree to the Terms of Service to continue.';
      formErr.hidden = false;
      if (!bad.length) { doc.getElementById('ff-agree').focus(); return; }
    } else {
      formErr.hidden = true;
    }

    if (bad.length) {
      // Send focus to the first thing that is actually wrong.
      var first = doc.getElementById(bad[0]);
      if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    if (!doc.getElementById('ff-agree').checked) return;

    var name = doc.getElementById('ff-name').value.trim();
    var email = doc.getElementById('ff-email').value.trim();

    // Hand the details to the local store so the dashboard
    // has something real to show, then swap the form for the receipt.
    try {
      if (global.Sitehouse) {
        var s = global.Sitehouse.load();
        s.customer.business = name;
        s.customer.email = email;
        s.customer.phone = doc.getElementById('ff-phone').value.trim();
        s.customer.hours = readHours();
        s.freePage = {
          hours: readHours(),
          maps: doc.getElementById('ff-maps').value.trim(),
          social: doc.getElementById('ff-social').value.trim(),
          images: (doc.getElementById('ff-images').files || []).length,
          video: (doc.getElementById('ff-video').files || []).length,
          orderedAt: Date.now(),
          dueAt: Date.now() + 48 * 3600 * 1000,
          status: 'building'
        };
        s.tier = 'free';
        global.Sitehouse.save();
      }
    } catch (ignored) { /* local store only; the receipt still shows */ }

    // Tell the inbox, if the endpoint is wired up. The receipt does not
    // wait on it and does not depend on it: a mail server having a bad
    // day is not a reason to lose the customer's two minutes of typing.
    try {
      global.fetch && global.fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          maps: doc.getElementById('ff-maps').value.trim(),
          phone: doc.getElementById('ff-phone').value.trim(),
          social: doc.getElementById('ff-social').value.trim(),
          email: email,
          hours: readHours(),
          images: (doc.getElementById('ff-images').files || []).length,
          video: (doc.getElementById('ff-video').files || []).length,
          company: ''                       // honeypot, left empty by humans
        })
      }).catch(function () { /* not configured yet, or offline */ });
    } catch (ignored) { /* older browser without fetch */ }

    done(name);
  });

  function done(name) {
    var wrap = form.parentNode;
    var due = new Date(Date.now() + 48 * 3600 * 1000);
    var when = due.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) +
               ', ' + due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    wrap.innerHTML =
      '<div class="free-done">' +
        '<p class="free-done-badge">Booked in</p>' +
        '<h2 class="free-done-h">We are building ' + name.replace(/[<>&]/g, '') + '.</h2>' +
        '<p class="free-done-p">A person picks this up, not a template generator. You will get an email ' +
          'the moment it is live, with the address you can start sending to customers.</p>' +
        '<div class="free-clock"><b>48</b><span>hours at most — due by ' + when + '</span></div>' +
        '<p class="free-done-p">Nothing else is needed from you right now. If you want to add photos or ' +
          'change something, it is all in your dashboard.</p>' +
        '<a href="start.html" class="free-submit" style="margin-top:1.6rem;text-decoration:none">' +
          '<span>Open my dashboard</span>' +
          '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M3 11h15.4M11 3.3l7.7 7.7-7.7 7.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a>' +
      '</div>';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})(window);
