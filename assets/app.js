/* ───────────────────────────────────────────────────────────────
   Onsite — dashboard: order rail, website preview, ratings

   Three pieces the old dashboard did not have, kept out of
   dashboard.js so that file stays about routing and the package
   builder.

   The order rail is the reason for the redesign. The order used to be
   printed into the middle of the page as a row of flat cards, so it
   scrolled away and competed with everything else. It now owns a
   column that never moves on a wide screen, and becomes a pull-up
   sheet below 1440px — one set of markup, rendered into two places.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var O = global.Onsite;
  if (!O) return;

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(c) { return O.euro(c); }

  /* ══ Stages ══════════════════════════════════════════════════ */
  var STAGES = [
    { key: 'deposit', label: 'Deposit paid' },
    { key: 'content', label: 'Your content received' },
    { key: 'build',   label: 'We build it' },
    { key: 'review',  label: 'Ready for your review' },
    { key: 'final',   label: 'Balance paid' },
    { key: 'live',    label: 'Live' }
  ];
  function stageIndex(stage) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === stage) return i;
    return 0;
  }

  /* ══ The order rail ══════════════════════════════════════════ */
  function railHtml() {
    var s = O.load();
    var o = s.order || { oneTimeCents: 0, monthlyCents: 0, oneTimeItems: [], monthlyItems: [] };
    var tier = s.tier || 'none';
    var free = tier === 'free';
    var stage = (s.project && s.project.stage) || 'deposit';
    var at = stageIndex(stage);

    var dep = O.deposit(o.oneTimeCents);
    var bal = O.balance(o.oneTimeCents);
    var depositPaid = at >= 0 && stage !== 'deposit';
    var balancePaid = at >= stageIndex('final');

    /* What is actually owed right now, and nothing else in colour. */
    var due, dueLabel, dueNote, dueAct, clear = false;
    if (free) {
      due = 0; dueLabel = 'Cost so far'; clear = true;
      dueNote = 'The free landing page stays free. Upgrade only when you want your own domain.';
      dueAct = { label: 'See the paid builds', act: 'go-build' };
    } else if (!depositPaid) {
      due = dep; dueLabel = 'Pay to start';
      dueNote = '25% today. The rest only once you have approved the finished site.';
      dueAct = { label: 'Pay ' + money(dep), act: 'go-build' };
    } else if (!balancePaid) {
      due = bal; dueLabel = 'Due on approval';
      dueNote = stage === 'review'
        ? 'Your site is ready. Approving it is what makes this due.'
        : 'Nothing to pay yet — this falls due when you approve the finished site.';
      dueAct = stage === 'review' ? { label: 'Review my website', act: 'go-website' } : null;
    } else {
      due = o.monthlyCents; dueLabel = 'Monthly'; clear = true;
      dueNote = o.monthlyCents ? 'Billed monthly. Stop any service at the end of a month.' : 'Nothing recurring.';
      dueAct = null;
    }

    var onceLines = (o.oneTimeItems || []).map(function (i) {
      return '<div class="ord-line"><span>' + esc(i.name) + '</span><b>' +
        (i.cents === 0 ? 'Included' : money(i.cents)) + '</b></div>';
    }).join('') || '<div class="ord-line"><span>Nothing yet</span><b>&mdash;</b></div>';

    var monthLines = (o.monthlyItems || []).map(function (m) {
      return '<div class="ord-line"><span>' + esc(m.name) + '</span><b>' + money(m.cents) + '</b></div>';
    }).join('');

    var steps = STAGES.map(function (st, i) {
      var cls = i < at ? 'is-done' : (i === at ? 'is-now' : '');
      return '<li class="ord-step ' + cls + '">' + esc(st.label) + '</li>';
    }).join('');

    return '' +
      '<div class="ord">' +
        '<div class="ord-due' + (clear ? ' ord-due--clear' : '') + '">' +
          '<p class="ord-due-l">' + dueLabel + '</p>' +
          '<p class="ord-due-v">' + money(due) + '</p>' +
          '<p class="ord-due-p">' + esc(dueNote) + '</p>' +
          (dueAct ? '<button type="button" class="ord-btn" data-act="' + dueAct.act + '">' +
                      esc(dueAct.label) + '</button>' : '') +
        '</div>' +
      '</div>' +

      '<div class="ord">' +
        '<div class="ord-head"><p>Your order</p><p>' + esc(tierName(tier)) + '</p></div>' +
        '<div class="ord-body">' +
          onceLines +
          '<div class="ord-sum"><span>One-time</span><b>' + money(o.oneTimeCents) + '</b></div>' +
          (monthLines
            ? '<div style="margin-top:.9rem;padding-top:.7rem;border-top:1px solid rgb(var(--c-line))">' +
              monthLines + '<div class="ord-sum"><span>Monthly</span><b>' + money(o.monthlyCents) + '</b></div></div>'
            : '') +
        '</div>' +
      '</div>' +

      '<div class="ord">' +
        '<div class="ord-head"><p>Where it is up to</p></div>' +
        '<div class="ord-body"><ul class="ord-steps">' + steps + '</ul></div>' +
      '</div>';
  }

  function tierName(t) {
    return { free: 'Free page', custom: 'Custom', full: 'Full Website',
             complete: 'Complete', none: 'No pack yet' }[t] || 'No pack yet';
  }

  function paintRail() {
    var html = railHtml();
    var rail = doc.querySelector('[data-order-rail]');
    var sheet = doc.querySelector('[data-order-sheet]');
    if (rail) rail.innerHTML = html;
    if (sheet) sheet.innerHTML = html;

    // The bar under 1440px mirrors whatever the rail's first card says.
    var s = O.load(), o = s.order || {};
    var bar = doc.querySelector('[data-sheet-bar]');
    if (!bar) return;
    bar.hidden = false;
    var stage = (s.project && s.project.stage) || 'deposit';
    var owed = stage === 'deposit' ? O.deposit(o.oneTimeCents || 0)
             : (stageIndex(stage) < stageIndex('final') ? O.balance(o.oneTimeCents || 0) : (o.monthlyCents || 0));
    doc.querySelector('[data-sheet-l]').textContent =
      stage === 'deposit' ? 'Pay to start' : (stageIndex(stage) < stageIndex('final') ? 'Due on approval' : 'Monthly');
    doc.querySelector('[data-sheet-v]').textContent = money(owed);
  }

  /* ══ The sheet ═══════════════════════════════════════════════ */
  (function sheet() {
    var el = doc.getElementById('orderSheet');
    if (!el) return;
    var last = null;

    function open() {
      last = doc.activeElement;
      el.hidden = false;
      // A frame between display and the class, or the transform has
      // nothing to animate from. The timer is the safety net: rAF is
      // starved in a background tab, and a sheet that is open but still
      // translated off-screen is a scrim over a page you cannot use.
      global.requestAnimationFrame(function () { el.classList.add('is-open'); });
      global.setTimeout(function () { el.classList.add('is-open'); }, 60);
      doc.body.style.overflow = 'hidden';
      var first = el.querySelector('button, a');
      if (first) first.focus();
    }
    function close() {
      el.classList.remove('is-open');
      doc.body.style.overflow = '';
      global.setTimeout(function () { el.hidden = true; }, 300);
      if (last && last.focus) last.focus();
    }

    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-sheet-open]')) { open(); return; }
      if (e.target.closest('[data-sheet-close]')) { close(); return; }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !el.hidden) close();
    });
    global.OnsiteSheet = { close: close };
  })();

  /* ══ Ratings ═════════════════════════════════════════════════ */
  var STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="m12 3.1 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.6l6.1-.9z"/></svg>';

  function starsHtml(value, opts) {
    opts = opts || {};
    var out = '<div class="stars' + (opts.small ? ' stars--sm' : '') +
              (opts.readonly ? ' stars--static' : '') + '"' +
              (opts.readonly ? ' role="img" aria-label="' + value + ' out of 5"' : '') + '>';
    for (var i = 1; i <= 5; i++) {
      out += '<' + (opts.readonly ? 'span' : 'button type="button"') +
        ' class="star' + (i <= value ? ' is-lit' : '') + '"' +
        (opts.readonly ? '' : ' data-star="' + i + '" role="radio" aria-checked="' + (i === value) +
                              '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '"') +
        '>' + STAR + '</' + (opts.readonly ? 'span' : 'button') + '>';
    }
    return out + '</div>';
  }

  function ratingStats() {
    var list = O.load().ratings || [];
    var total = list.length;
    var sum = list.reduce(function (a, r) { return a + r.stars; }, 0);
    var buckets = [0, 0, 0, 0, 0];
    list.forEach(function (r) { buckets[r.stars - 1]++; });
    return { list: list, total: total, avg: total ? sum / total : 0, buckets: buckets };
  }

  (function rateModal() {
    var el = doc.getElementById('rateModal');
    if (!el) return;
    var picked = 0;
    var starBox = el.querySelector('[data-rate-stars]');
    var body = el.querySelector('#rateBody');
    var err = el.querySelector('[data-rate-err]');
    var last = null;

    function paint() { starBox.innerHTML = starsHtml(picked); }

    function open() {
      var mine = (O.load().ratings || []).filter(function (r) { return r.mine; })[0];
      picked = mine ? mine.stars : 0;
      body.value = mine ? mine.body : '';
      err.hidden = true;
      paint();
      last = doc.activeElement;
      el.hidden = false;
      doc.body.style.overflow = 'hidden';
      var b = starBox.querySelector('.star');
      if (b) b.focus();
    }
    function close() {
      el.hidden = true;
      doc.body.style.overflow = '';
      if (last && last.focus) last.focus();
    }

    starBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-star]');
      if (!b) return;
      picked = +b.getAttribute('data-star');
      paint();
      starBox.querySelectorAll('.star')[picked - 1].focus();
    });
    // Arrow keys, because a radiogroup that only takes a mouse is not one.
    starBox.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      picked = Math.min(5, Math.max(1, picked + (e.key === 'ArrowRight' ? 1 : -1)));
      paint();
      starBox.querySelectorAll('.star')[picked - 1].focus();
    });

    el.querySelector('[data-rate-save]').addEventListener('click', function () {
      if (!picked) {
        err.textContent = 'Pick a number of stars first.';
        err.hidden = false;
        return;
      }
      var s = O.load();
      var c = s.customer;
      s.ratings = (s.ratings || []).filter(function (r) { return !r.mine; });
      s.ratings.unshift({
        id: 'R-' + Date.now(),
        stars: picked,
        body: body.value.trim(),
        who: (c.firstName || 'You') + ' ' + ((c.lastName || '')[0] || '') + '.',
        business: c.business || '',
        at: new Date().toISOString().slice(0, 10),
        mine: true
      });
      O.save();
      close();
      if (global.OnsiteDash && global.OnsiteDash.render) global.OnsiteDash.render(true);
    });

    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-rate-open]')) { open(); return; }
      if (e.target.closest('[data-rate-close]')) { close(); return; }
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.hidden) close(); });
  })();

  /* ══ Website preview ═════════════════════════════════════════
     The iframe is scaled with a transform rather than resized, so the
     page inside lays out at a real viewport width and we see the true
     desktop or phone layout, not a squashed one. */
  function fitPreview(stage) {
    var frame = stage.querySelector('.prev-frame');
    if (!frame) return;
    var view = stage.getAttribute('data-view') || 'desktop';
    var width = view === 'phone' ? 390 : 1280;
    var scale = Math.min(1, stage.clientWidth / (width + (view === 'phone' ? 40 : 0)));
    frame.style.transform = 'translateX(-50%) scale(' + scale + ')';
  }

  function bindPreviews() {
    [].forEach.call(doc.querySelectorAll('.prev-stage'), function (stage) { fitPreview(stage); });
  }

  doc.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-prev-view]');
    if (!tab) return;
    var stage = doc.querySelector('.prev-stage');
    if (!stage) return;
    stage.setAttribute('data-view', tab.getAttribute('data-prev-view'));
    [].forEach.call(doc.querySelectorAll('[data-prev-view]'), function (t) {
      t.classList.toggle('is-on', t === tab);
    });
    fitPreview(stage);
  });

  var t = null;
  global.addEventListener('resize', function () {
    global.clearTimeout(t);
    t = global.setTimeout(bindPreviews, 120);
  });

  /* ══ Exposed to dashboard.js ═════════════════════════════════ */
  global.OnsiteApp = {
    paintRail: paintRail,
    bindPreviews: bindPreviews,
    starsHtml: starsHtml,
    ratingStats: ratingStats,
    STAGES: STAGES,
    stageIndex: stageIndex,
    tierName: tierName
  };
})(window);
