/* ───────────────────────────────────────────────────────────────
   Sitehouse — the dashboard assistant

   Deliberately a hybrid, and the split matters.

   Most of what a customer asks a dashboard is a lookup: what do I owe,
   where is my site up to, what did I pay for, when are my hours set
   to. Those answers are already in the store, exactly, and sending
   them to a language model would be slower, cost money on every turn,
   and introduce the one thing a billing question must never have — a
   chance of being wrong. So they are answered locally, instantly, and
   for nothing.

   Anything open-ended — write me an About paragraph, what should I put
   in my services section — goes to /api/ai, which talks to whichever
   provider is configured server-side.

   With no provider configured the panel still works: it answers the
   lookups and says plainly that the writing side needs setting up. It
   never pretends to be offline when it is only unconfigured.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var O = global.Sitehouse;
  if (!O) return;

  var log, input, sendBtn, panel, fab, dot, headSub, chips;
  var history = [];          // what we send upstream
  var remote = null;         // null = unknown, true/false once we have tried
  var busy = false;

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function money(c) { return O.euro(c); }

  /* ══ What the assistant is allowed to know ═══════════════════
     A deliberately small slice. No email, no address, no password —
     if it never reaches the request it can never reach a provider. */
  function context() {
    var s = O.load();
    var o = s.order || {};
    var hours = (s.freePage && s.freePage.hours) || s.customer.hours || [];
    return {
      business: s.customer.business,
      pack: s.tier || 'none',
      stage: s.project && s.project.stage,
      statusLabel: O.statusLabel(),
      oneTimeTotal: money(o.oneTimeCents || 0),
      monthlyTotal: money(o.monthlyCents || 0),
      depositPaid: (s.project && s.project.stage) !== 'deposit',
      balanceDue: money(O.balance(o.oneTimeCents || 0)),
      items: (o.oneTimeItems || []).map(function (i) { return i.name; }),
      monthly: (o.monthlyItems || []).map(function (m) { return m.name; }),
      featuresBuilt: (s.project && s.project.features) || [],
      hoursSet: hours.length,
      openChangeRequests: (s.changeRequests || [])
        .filter(function (c) { return c.status !== 'completed'; }).length
    };
  }

  /* ══ Lookups — answered here, never sent anywhere ════════════ */
  function localAnswer(q) {
    var t = q.toLowerCase();
    var s = O.load();
    var o = s.order || {};
    var has = function () {
      for (var i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) > -1) return true;
      return false;
    };

    if (has('owe', 'due', 'pay', 'payment', 'invoice', 'balance', 'cost me')) {
      var bal = O.balance(o.oneTimeCents || 0);
      var dep = O.deposit(o.oneTimeCents || 0);
      if ((s.project && s.project.stage) === 'deposit') {
        return 'Nothing has been charged yet. To start, the deposit is ' + money(dep) +
               ' — 25% of your ' + money(o.oneTimeCents || 0) + ' one-time total. ' +
               'The remaining ' + money(bal) + ' is only due once you have approved the finished site.';
      }
      if ((s.project && s.project.stage) === 'live') {
        return 'Your one-time total is settled. What continues is ' + money(o.monthlyCents || 0) +
               ' a month for your monthly services. Full history is on the Payments page.';
      }
      return 'You have paid the ' + money(dep) + ' deposit. The remaining ' + money(bal) +
             ' falls due when you approve the finished website — not before. Nothing is taken automatically.';
    }

    if (has('status', 'how far', 'where is', 'progress', 'ready yet', 'when will')) {
      return 'Your site is at: ' + O.statusLabel() + '. Last updated ' + O.date(s.project.lastUpdate) +
             '. The build target is about 7 days from the last piece of content you send — a target, not a promise.';
    }

    if (has('what did i', 'what am i', 'my order', 'my package', 'included', 'what do i get')) {
      var once = (o.oneTimeItems || []).map(function (i) { return i.name; }).join(', ') || 'nothing yet';
      var mon = (o.monthlyItems || []).map(function (m) { return m.name; }).join(', ') || 'none';
      return 'One-time: ' + once + ' (' + money(o.oneTimeCents || 0) + ').\n' +
             'Monthly: ' + mon + (o.monthlyCents ? ' (' + money(o.monthlyCents) + ' a month)' : '') + '.';
    }

    if (has('hour', 'open', 'closing', 'closed')) {
      var hrs = (s.freePage && s.freePage.hours) || s.customer.hours || [];
      if (!hrs.length) return 'No opening hours are set yet. You can add them on the Business info page.';
      return hrs.map(function (h) { return h.day + ': ' + h.open; }).join('\n');
    }

    if (has('change', 'edit', 'update my', 'wrong', 'fix')) {
      return 'Send it through Request a change — that page logs it against your project so nothing gets lost ' +
             'in a thread. Before you approve the site there is no limit and no charge for changes.';
    }

    if (has('cancel', 'refund', 'money back')) {
      return 'The Cancellation and Refund Policy has the exact terms — it is linked in the footer. ' +
             'The short version: the 25% books the work in, and the 75% is only ever due after you approve.';
    }

    if (has('rate', 'review', 'feedback', 'stars')) {
      return 'The Ratings page has a Rate us button. It takes about ten seconds and shows on our public site ' +
             'next to your business name.';
    }

    if (has('domain', 'hosting', 'address', 'url')) {
      return 'Hosting, the padlock and the domain come with every build — the first year on Custom and Full, ' +
             'three years on Complete. After that it is ' + money(1000) + ' a month. On the free page you are ' +
             'on an address we provide until you want your own name.';
    }

    return null;
  }

  /* ══ Rendering ═══════════════════════════════════════════════ */
  function bubble(who, text, opts) {
    opts = opts || {};
    var el = doc.createElement('div');
    el.className = 'ai-msg ai-msg--' + who + (opts.error ? ' ai-msg--err' : '');
    // Only the strings this file writes contain markup; anything from a
    // model or a person is escaped.
    el.innerHTML = opts.html ? text : esc(text);
    log.appendChild(el);

    if (opts.source) {
      var tag = doc.createElement('p');
      tag.className = 'ai-src';
      tag.textContent = opts.source;
      log.appendChild(tag);
    }
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function thinking(on) {
    var old = log.querySelector('.ai-think');
    if (old) old.remove();
    if (!on) return;
    var el = doc.createElement('div');
    el.className = 'ai-think';
    el.innerHTML = '<i></i><i></i><i></i>';
    el.setAttribute('aria-label', 'Thinking');
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function setMode(on) {
    remote = on;
    dot.setAttribute('data-state', on ? 'live' : 'local');
    headSub.textContent = on
      ? 'Answers about your account, and help with wording'
      : 'Answers about your account';
  }

  /* ══ Asking ══════════════════════════════════════════════════ */
  function ask(text) {
    if (busy || !text.trim()) return;
    var q = text.trim();
    bubble('me', q);
    input.value = '';
    input.style.height = '';

    var local = localAnswer(q);
    if (local) {
      // Straight from the store. No round trip, no cost, no chance of
      // a model inventing a number.
      bubble('bot', local, { source: 'from your account' });
      history.push({ role: 'user', content: q });
      history.push({ role: 'assistant', content: local });
      return;
    }

    if (remote === false) {
      bubble('bot',
        'I can answer anything about your account — what you owe, where the build is up to, your hours, ' +
        'your order. For writing help the assistant needs an AI provider connected, which has not been ' +
        'set up yet. <a href="#/support">Ask support</a> and a person will answer.',
        { html: true });
      return;
    }

    busy = true;
    sendBtn.disabled = true;
    thinking(true);
    history.push({ role: 'user', content: q });

    global.fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12), context: context() })
    }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).then(function (res) {
      thinking(false);
      if (res.ok && res.d.text) {
        setMode(true);
        bubble('bot', res.d.text, { source: 'written by AI — check anything factual' });
        history.push({ role: 'assistant', content: res.d.text });
        return;
      }
      history.pop();                       // do not keep an unanswered turn
      if (res.d && res.d.error === 'not_configured') {
        setMode(false);
        bubble('bot',
          'No AI provider is connected yet, so I can only answer things I can look up in your account. ' +
          '<a href="#/support">Ask support</a> for anything else.', { html: true });
      } else if (res.status === 429 || (res.d && res.d.error === 'rate_limited')) {
        bubble('bot', 'The AI provider is rate-limiting us right now. Give it a minute and ask again.',
               { error: true });
      } else {
        bubble('bot', 'That did not go through. Your account questions still work — try one of those, ' +
                      'or ask support.', { error: true });
      }
    }).catch(function () {
      thinking(false);
      history.pop();
      bubble('bot', 'No connection. Account questions still work offline.', { error: true });
    }).then(function () {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    });
  }

  /* ══ Build ═══════════════════════════════════════════════════ */
  var CHIPS = [
    'What do I owe?',
    'Where is my website up to?',
    'What is in my order?',
    'Write me an About paragraph'
  ];

  function build() {
    if (doc.querySelector('.ai')) return;

    fab = doc.createElement('button');
    fab.type = 'button';
    fab.className = 'ai-fab';
    fab.setAttribute('data-no-i18n', '');
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.7L12 16l-1.7-4.6L5.8 9.7 10.3 8z"/><path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>' +
      '</svg><span class="ai-fab-t">Ask</span>';
    fab.setAttribute('aria-label', 'Open the assistant');
    doc.body.appendChild(fab);

    var wrap = doc.createElement('div');
    wrap.className = 'ai';
    wrap.hidden = true;
    wrap.setAttribute('data-no-i18n', '');
    wrap.innerHTML =
      '<button type="button" class="ai-scrim" data-ai-close aria-label="Close"></button>' +
      '<div class="ai-panel" role="dialog" aria-modal="true" aria-label="Assistant">' +
        '<div class="ai-head">' +
          '<span class="ai-dot" data-ai-dot data-state="local" aria-hidden="true"></span>' +
          '<span><span class="ai-head-t">Assistant</span><br>' +
            '<span class="ai-head-s" data-ai-sub>Answers about your account</span></span>' +
          '<button type="button" class="ai-x" data-ai-close aria-label="Close">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="ai-log" data-ai-log role="log" aria-live="polite"></div>' +
        '<div class="ai-chips" data-ai-chips></div>' +
        '<form class="ai-form" data-ai-form>' +
          '<textarea class="ai-in" data-ai-in rows="1" placeholder="Ask about your account…" aria-label="Your question"></textarea>' +
          '<button type="submit" class="ai-send" data-ai-send aria-label="Send">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>' +
          '</button>' +
        '</form>' +
        '<p class="ai-foot">Account answers come from your own data. Anything written by AI is marked, and ' +
          'it cannot change your account, take payment or approve your site.</p>' +
      '</div>';
    doc.body.appendChild(wrap);

    panel = wrap;
    log = wrap.querySelector('[data-ai-log]');
    input = wrap.querySelector('[data-ai-in]');
    sendBtn = wrap.querySelector('[data-ai-send]');
    dot = wrap.querySelector('[data-ai-dot]');
    headSub = wrap.querySelector('[data-ai-sub]');
    chips = wrap.querySelector('[data-ai-chips]');

    chips.innerHTML = CHIPS.map(function (c) {
      return '<button type="button" class="ai-chip">' + esc(c) + '</button>';
    }).join('');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.ai-chip');
      if (b) ask(b.textContent);
    });

    wrap.querySelector('[data-ai-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
    });

    // Enter sends, Shift+Enter breaks the line — and the box grows.
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 128) + 'px';
    });

    fab.addEventListener('click', open);
    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-ai-close]')) close();
      if (e.target.closest('[data-ai-open]')) open();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    greet();
  }

  var lastFocus = null;

  function open() {
    lastFocus = doc.activeElement;
    panel.hidden = false;
    global.requestAnimationFrame(function () { panel.classList.add('is-open'); });
    global.setTimeout(function () { panel.classList.add('is-open'); }, 60);
    fab.hidden = true;
    global.setTimeout(function () { input.focus(); }, 120);
  }

  function close() {
    panel.classList.remove('is-open');
    global.setTimeout(function () { panel.hidden = true; fab.hidden = false; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function greet() {
    var s = O.load();
    bubble('bot',
      'Hello ' + esc(s.customer.firstName || 'there') + '. I can tell you exactly what you owe, where your ' +
      'build is up to, or what is in your order — those come straight from your account. I can also help ' +
      'write the words for your site.', { html: true });
  }

  /* Ask the endpoint once, quietly, so the header is honest about what
     this thing can actually do before anyone types. */
  function probe() {
    if (!global.fetch) { setMode(false); return; }
    global.fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], context: {} })
    }).then(function (r) {
      if (r.status === 503) { setMode(false); return; }
      setMode(r.ok || r.status === 429);
    }).catch(function () { setMode(false); });
  }

  function start() {
    if (!doc.body.hasAttribute('data-app')) return;   // dashboard and admin only
    build();
    probe();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
