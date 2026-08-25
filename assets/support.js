/* ───────────────────────────────────────────────────────────────
   Sitehouse — help & support

   A thread stays in the list from the moment it is posted until it is
   answered, and the waiting state is drawn on the conversation itself.
   That is the whole point: someone who has just reported a problem
   wants to see the problem sitting there, marked as waiting, not a
   confirmation toast that vanishes and leaves them wondering.

   Everything is local in this demo — the same store the rest of the
   app uses. Behind a real backend the three functions that touch
   `threads` become fetches and nothing else in this file changes.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var O = global.Sitehouse;
  if (!O) return;

  var REPLY_HOURS = 4;

  var KINDS = [
    { key: 'question', label: 'A question',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.4 2.4 0 1 1 3.2 2.3c-.6.3-.8.7-.8 1.4M12 16.5h.01"/>' },
    { key: 'problem', label: 'Something is broken',
      icon: '<path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>' },
    { key: 'change', label: 'Change my site',
      icon: '<path d="M14.5 6a4 4 0 0 0 5 5l-8 8a2.8 2.8 0 0 1-4-4z"/>' },
    { key: 'billing', label: 'Billing',
      icon: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19"/>' }
  ];

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ══ Store ═══════════════════════════════════════════════════ */
  function all() {
    var s = O.load();
    if (!Array.isArray(s.threads)) s.threads = [];
    return s.threads;
  }
  function commit() { O.save(); }

  function unanswered() {
    return all().filter(function (t) { return t.status === 'waiting'; }).length;
  }

  /* ══ Time ════════════════════════════════════════════════════ */
  function ago(ts) {
    var mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.round(hrs / 24) + 'd ago';
  }
  function within(ts) {
    var left = ts + REPLY_HOURS * 3600000 - Date.now();
    if (left <= 0) return 'any moment now';
    // Round to whole minutes first and derive hours from that. Rounding
    // the remainder separately produced "3h 60m".
    var mins = Math.round(left / 60000);
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (!h) return 'within ' + m + ' minute' + (m === 1 ? '' : 's');
    if (!m) return 'within ' + h + ' hour' + (h === 1 ? '' : 's');
    return 'within ' + h + 'h ' + m + 'm';
  }
  function clock(ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
           d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  /* ══ The page ════════════════════════════════════════════════ */
  var listEl, viewEl, paneEl, open = null;

  function kindLabel(k) {
    var hit = KINDS.filter(function (x) { return x.key === k; })[0];
    return hit ? hit.label : 'Message';
  }

  function paintList() {
    var t = all();
    if (!t.length) {
      listEl.innerHTML = '<p class="sup-empty">No messages yet. Ask us anything — a person reads all of them.</p>';
      return;
    }
    listEl.innerHTML = t.slice().sort(function (a, b) { return b.at - a.at; }).map(function (th) {
      var waiting = th.status === 'waiting';
      var lastMsg = th.messages[th.messages.length - 1];
      return '<button type="button" class="sup-thread' + (open === th.id ? ' is-on' : '') +
             '" data-thread="' + esc(th.id) + '">' +
        '<span class="sup-thread-top">' +
          '<span class="sup-thread-s">' + esc(th.subject) + '</span>' +
          '<span class="sup-thread-w">' + ago(th.at) + '</span>' +
        '</span>' +
        '<span class="sup-thread-p">' + esc(lastMsg ? lastMsg.body : '') + '</span>' +
        '<span class="sup-thread-tags">' +
          '<span class="sup-tag ' + (waiting ? 'sup-tag--wait' : 'sup-tag--done') + '">' +
            (waiting ? 'Waiting for reply' : 'Answered') + '</span>' +
          '<span class="sup-tag sup-tag--kind">' + esc(kindLabel(th.kind)) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
  }

  function paintThread(id) {
    var th = all().filter(function (x) { return x.id === id; })[0];
    if (!th) return composer();
    open = id;

    var msgs = th.messages.map(function (m) {
      var mine = m.from === 'you';
      return '<div class="sup-msg sup-msg--' + (mine ? 'me' : 'them') + '">' + esc(m.body) + '</div>' +
             '<p class="sup-meta sup-meta--' + (mine ? 'me' : 'them') + '">' +
               (mine ? 'You' : 'Sitehouse') + ' · ' + clock(m.at) + '</p>';
    }).join('');

    var waiting = th.status === 'waiting'
      ? '<div class="sup-wait">' +
          '<span class="sup-wait-p" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<span>Waiting for a reply — <b>' + within(th.at) + '</b></span>' +
        '</div>'
      : '';

    viewEl.innerHTML =
      '<div class="sup-bar">' +
        '<button type="button" class="sup-back" data-sup-back aria-label="Back to messages">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '</button>' +
        '<span style="min-width:0">' +
          '<span class="sup-bar-t">' + esc(th.subject) + '</span><br>' +
          '<span class="sup-bar-s">' + esc(kindLabel(th.kind)) + ' · opened ' + ago(th.at) + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="sup-log" data-sup-log role="log" aria-live="polite">' + msgs + waiting + '</div>' +
      '<form class="sup-form" data-sup-reply>' +
        '<textarea class="sup-in" rows="1" placeholder="Add to this message…" aria-label="Add to this message"></textarea>' +
        '<button type="submit" class="sup-send" aria-label="Send">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>' +
        '</button>' +
      '</form>';

    var log = viewEl.querySelector('[data-sup-log]');
    log.scrollTop = log.scrollHeight;
    showPane(true);
    paintList();
  }

  function composer() {
    open = null;
    viewEl.innerHTML =
      '<div class="sup-bar">' +
        '<button type="button" class="sup-back" data-sup-back aria-label="Back to messages">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '</button>' +
        '<span><span class="sup-bar-t">New message</span></span>' +
      '</div>' +
      '<div class="sup-new-wrap">' +
        '<h2 class="sup-new-h">What can we help with?</h2>' +
        '<p class="sup-new-p">A person reads every message and replies within ' + REPLY_HOURS +
          ' hours between 09:00 and 21:00. It stays in your list, marked as waiting, until it is answered.</p>' +

        '<div class="sup-kinds" role="radiogroup" aria-label="Type of message">' +
          KINDS.map(function (k, i) {
            return '<button type="button" class="sup-kind' + (i === 0 ? ' is-on' : '') +
              '" data-kind="' + k.key + '" role="radio" aria-checked="' + (i === 0) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                k.icon + '</svg><span>' + esc(k.label) + '</span></button>';
          }).join('') +
        '</div>' +

        '<div class="sup-field">' +
          '<label for="sup-subject">Subject</label>' +
          '<input id="sup-subject" type="text" placeholder="Short version, in a few words">' +
        '</div>' +
        '<div class="sup-field">' +
          '<label for="sup-body">What happened?</label>' +
          '<textarea id="sup-body" placeholder="As much or as little as you like. Screenshots can follow by email."></textarea>' +
        '</div>' +
        '<p class="sup-err" data-sup-err hidden></p>' +
        '<button type="button" class="sup-post" data-sup-post>Send it</button>' +
      '</div>';
    showPane(true);
    paintList();
  }

  function blank() {
    open = null;
    viewEl.innerHTML =
      '<div class="sup-blank">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5a8.2 8.2 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.5-8.4 8.4 8.4 0 0 1 8.5 8.4z"/></svg>' +
        '<p>Pick a message on the left, or start a new one.</p>' +
      '</div>';
    showPane(false);
    paintList();
  }

  function showPane(on) {
    if (!paneEl) return;
    paneEl.classList.toggle('is-open', !!on);
    if (on) doc.body.style.overflow = global.innerWidth < 900 ? 'hidden' : '';
    else doc.body.style.overflow = '';
  }

  /* ══ Actions ═════════════════════════════════════════════════ */
  function post(kind, subject, body) {
    var s = O.load();
    if (!Array.isArray(s.threads)) s.threads = [];
    var id = 'T-' + Date.now();
    s.threads.unshift({
      id: id, kind: kind, subject: subject, at: Date.now(), status: 'waiting',
      messages: [{ from: 'you', at: Date.now(), body: body }]
    });
    commit();
    return id;
  }

  function addTo(id, body) {
    var th = all().filter(function (x) { return x.id === id; })[0];
    if (!th) return;
    th.messages.push({ from: 'you', at: Date.now(), body: body });
    // Adding to an answered thread reopens it — otherwise a follow-up
    // question sits there looking as though it was already dealt with.
    th.status = 'waiting';
    th.at = Date.now();
    commit();
  }

  /* ══ Wiring ══════════════════════════════════════════════════ */
  function init() {
    listEl = doc.querySelector('[data-sup-threads]');
    viewEl = doc.querySelector('[data-sup-view]');
    paneEl = doc.querySelector('[data-sup-pane]');
    if (!listEl || !viewEl) return;

    // No seeded conversation. An invented exchange in a real support
    // inbox is a fake testimonial wearing a different hat.

    blank();

    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-thread]');
      if (t) { paintThread(t.getAttribute('data-thread')); return; }

      if (e.target.closest('[data-sup-new]')) { composer(); return; }
      if (e.target.closest('[data-sup-back]')) { blank(); return; }

      var k = e.target.closest('[data-kind]');
      if (k) {
        [].forEach.call(doc.querySelectorAll('[data-kind]'), function (b) {
          var on = b === k;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        return;
      }

      if (e.target.closest('[data-sup-post]')) {
        var kind = (doc.querySelector('[data-kind].is-on') || {}).getAttribute
                 ? doc.querySelector('[data-kind].is-on').getAttribute('data-kind') : 'question';
        var subject = doc.getElementById('sup-subject').value.trim();
        var body = doc.getElementById('sup-body').value.trim();
        var err = doc.querySelector('[data-sup-err]');

        if (!body) {
          err.textContent = 'Tell us what happened — even one line is enough.';
          err.hidden = false;
          doc.getElementById('sup-body').focus();
          return;
        }
        var id = post(kind, subject || body.slice(0, 48), body);
        paintThread(id);
        badge();
      }
    });

    doc.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-sup-reply]');
      if (!f) return;
      e.preventDefault();
      var box = f.querySelector('textarea');
      var text = box.value.trim();
      if (!text || !open) return;
      addTo(open, text);
      box.value = '';
      paintThread(open);
      badge();
    });

    // Enter sends in the reply box, Shift+Enter breaks the line.
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      var box = e.target.closest('[data-sup-reply] textarea');
      if (!box) return;
      e.preventDefault();
      var f = box.closest('form');
      if (f.requestSubmit) f.requestSubmit();
      else f.dispatchEvent(new Event('submit', { cancelable: true }));
    });

    global.addEventListener('resize', function () {
      if (global.innerWidth >= 900) doc.body.style.overflow = '';
    });

    // The relative times go stale on a page left open.
    global.setInterval(function () { if (!open) paintList(); }, 60000);
  }

  /* ══ The corner button, on every public page ═════════════════ */
  function badge() {
    var n = unanswered();
    var el = doc.querySelector('.sup-fab-n');
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
  }

  function fab() {
    if (doc.body.hasAttribute('data-app')) return;         // the app has its own
    if (doc.querySelector('.sup-fab')) return;
    var here = global.location.pathname.split('/').pop().replace(/\.html$/, '');
    if (here === 'support') return;

    var a = doc.createElement('a');
    a.className = 'sup-fab';
    a.href = 'support.html';
    a.setAttribute('data-no-i18n', '');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5a8.2 8.2 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.5-8.4 8.4 8.4 0 0 1 8.5 8.4z"/></svg>' +
      '<span class="sup-fab-t">Help</span>' +
      '<span class="sup-fab-n" hidden>0</span>';
    doc.body.appendChild(a);
    badge();
  }

  function start() {
    fab();
    if (doc.querySelector('[data-sup-threads]')) { init(); badge(); }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
