/* ───────────────────────────────────────────────────────────────
   Xovah — the project builder on /start

   Browse → Choose → Customise → Describe → Review → Send.

   No account, no login, no payment. A visitor picks a package, ticks
   the extras they want, watches the total add itself up, describes
   what they need, reads the request that was written for them, and
   sends it. That is the whole system.

   Where things live
   ─────────────────
   · Packages and extras come from Sitehouse.CATALOG (assets/demo.js).
     Nothing here hard-codes a price — one catalogue, one truth.
   · Selections share the `sitehouse.build` key with the old builder,
     so anyone who configured a package there arrives here with their
     picks already ticked.
   · The brief and the optional fields are kept under their own key so
     a refresh, or a wander off to read the FAQ, does not throw away
     what somebody just typed.
   · Sending posts to /api/contact with a `project` object. That
     endpoint mails it through Resend server-side.

   The generated message is built from the selections every time they
   change. There is no template with a worked example baked into it:
   change the package and the message changes with it.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var root = doc.querySelector('[data-pj]');
  if (!root) return;

  var O = global.Sitehouse;
  if (!O || !O.CATALOG) return;

  /* The sticky phone bar is fixed, so it has to sit outside <main>.
     Scoping every lookup to <main> therefore misses it. These two look
     inside the builder first and then across the document, which is
     safe here because data-pj-* belongs to this page alone. */
  function one(sel) { return root.querySelector(sel) || doc.querySelector(sel); }
  function all(sel) { return doc.querySelectorAll(sel); }

  var CAT = O.CATALOG;
  var ENDPOINT = '/api/contact';

  /* Shared with build.html so a basket started there survives the
     journey. The text fields get their own key — they are long, they
     are personal, and they have nothing to do with a price. */
  var PICKS_KEY = 'sitehouse.build';
  var BRIEF_KEY = 'sitehouse.brief';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* The paid packages, in catalogue order. The free landing page has
     its own page and its own questions (photos, opening hours), so it
     is linked to rather than mixed in here — a €0 card sitting beside
     three priced ones only ever gets asked about. */
  var TIERS = {};
  var TIER_LIST = [];
  CAT.websites.forEach(function (w) {
    if (w.cents > 0) { TIERS[w.key] = w; TIER_LIST.push(w); }
  });

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var ONCE_BY_KEY = {};
  CAT.oneTime.forEach(function (i) { ONCE_BY_KEY[slug(i.name)] = i; });

  var MONTH_BY_KEY = {};
  CAT.monthly.forEach(function (m) { MONTH_BY_KEY[slug(m.name)] = m; });

  /* ── State ───────────────────────────────────────────────────── */
  var picks = { tier: null, extras: {}, monthly: {} };
  var brief = {
    text: '',
    email: '',
    businessName: '', siteType: '', style: '', colours: '',
    features: '', references: '', notes: ''
  };

  function loadPicks() {
    try {
      var raw = global.localStorage.getItem(PICKS_KEY);
      if (!raw) return;
      var v = JSON.parse(raw);
      if (!v || typeof v !== 'object') return;
      picks.tier = TIERS[v.tier] ? v.tier : null;
      picks.extras = (v.extras && typeof v.extras === 'object') ? v.extras : {};
      picks.monthly = (v.monthly && typeof v.monthly === 'object') ? v.monthly : {};
    } catch (e) { /* private mode, corrupt JSON — start clean */ }
  }
  function savePicks() {
    try { global.localStorage.setItem(PICKS_KEY, JSON.stringify(picks)); } catch (e) {}
  }

  function loadBrief() {
    try {
      var raw = global.localStorage.getItem(BRIEF_KEY);
      if (!raw) return;
      var v = JSON.parse(raw);
      if (!v || typeof v !== 'object') return;
      Object.keys(brief).forEach(function (k) {
        if (typeof v[k] === 'string') brief[k] = v[k];
      });
    } catch (e) {}
  }
  function saveBrief() {
    try { global.localStorage.setItem(BRIEF_KEY, JSON.stringify(brief)); } catch (e) {}
  }

  /* ── Money ───────────────────────────────────────────────────
     Follows the site's currency switcher like every other price on
     the site. The request that leaves here carries raw cents, and the
     email prints euro, because euro is what gets invoiced. */
  function money(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }
  function euro(cents) { return '€' + (cents / 100).toFixed(2); }
  function showingEuro() {
    return !global.SitehouseI18n || global.SitehouseI18n.currency === 'EUR';
  }

  function chosenExtras() {
    return Object.keys(picks.extras)
      .filter(function (k) { return picks.extras[k] && ONCE_BY_KEY[k]; })
      .map(function (k) { return ONCE_BY_KEY[k]; });
  }
  function chosenMonthly() {
    return Object.keys(picks.monthly)
      .filter(function (k) { return picks.monthly[k] && MONTH_BY_KEY[k]; })
      .map(function (k) { return MONTH_BY_KEY[k]; });
  }

  function totals() {
    var tier = picks.tier ? TIERS[picks.tier] : null;
    var once = chosenExtras();
    var mon = chosenMonthly();
    var extrasCents = once.reduce(function (n, i) { return n + i.cents; }, 0);
    var monthCents = mon.reduce(function (n, i) { return n + i.cents; }, 0);
    return {
      tier: tier,
      website: tier ? tier.cents : 0,
      extras: once,
      extrasCents: extrasCents,
      monthly: mon,
      monthlyCents: monthCents,
      total: (tier ? tier.cents : 0) + extrasCents
    };
  }

  /* ══ Render: the packages ═════════════════════════════════════ */
  function renderTiers() {
    var host = root.querySelector('[data-pj-tiers]');
    if (!host) return;

    host.innerHTML = TIER_LIST.map(function (w) {
      var on = picks.tier === w.key;
      return '' +
        '<label class="bd-tier' + (on ? ' is-on' : '') + '" data-pj-tier-card="' + w.key + '">' +
          '<input type="radio" name="pj-tier" value="' + w.key + '" data-pj-tier' +
            (on ? ' checked' : '') + '>' +
          '<span class="bd-tier-box">' +
            '<span class="bd-tier-top">' +
              '<span class="bd-tier-name">' + O.esc(w.name) + '</span>' +
              '<span class="bd-tier-tick" aria-hidden="true">' +
                '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.8" ' +
                'stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 8.4l3 3 6.2-6.6"/></svg>' +
              '</span>' +
            '</span>' +
            '<span class="bd-tier-price"><b class="cur" data-eur="' + (w.cents / 100) + '">' +
              money(w.cents) + '</b> <span class="bd-tier-flag">one-time</span></span>' +
            '<span class="bd-tier-blurb">' + O.esc(w.blurb) + '</span>' +
            '<span class="bd-tier-dep">' + O.esc(w.note) + '</span>' +
          '</span>' +
        '</label>';
    }).join('');

    host.addEventListener('change', function (e) {
      var r = e.target.closest ? e.target.closest('[data-pj-tier]') : null;
      if (!r || !r.checked) return;
      picks.tier = r.value;
      savePicks();
      markTiers();
      var card = host.querySelector('[data-pj-tier-card="' + r.value + '"]');
      if (card) bump(card);
      paint();
    });

    if (global.SitehouseI18n && global.SitehouseI18n.paintPrices) {
      global.SitehouseI18n.paintPrices(host);
    }
  }

  function markTiers() {
    [].forEach.call(root.querySelectorAll('[data-pj-tier-card]'), function (card) {
      card.classList.toggle('is-on', card.getAttribute('data-pj-tier-card') === picks.tier);
    });
  }

  /* ══ Render: the extras ═══════════════════════════════════════
     Seventy-six tick boxes at once is not a choice, it is a wall. They
     are grouped and closed, and any group with something already
     ticked opens itself so a returning basket is visible. */
  function renderExtras() {
    var host = root.querySelector('[data-pj-extras]');
    if (!host) return;

    function row(item, kind, key) {
      var on = kind === 'monthly' ? !!picks.monthly[key] : !!picks.extras[key];
      var price = (item.from ? 'from ' : '') +
        '<span class="cur" data-eur="' + (item.cents / 100) + '">' + money(item.cents) + '</span>' +
        (kind === 'monthly' ? ' <span class="bd-tier-flag">/mo</span>' : '');
      return '<label class="bd-item">' +
        '<input type="checkbox" data-pj-extra="' + key + '" data-pj-kind="' + kind + '"' +
          (on ? ' checked' : '') + '>' +
        '<span class="bd-box" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" ' +
          'stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3.4 8.4l3 3 6.2-6.6"/></svg></span>' +
        '<span class="bd-item-name">' + O.esc(item.name) + '</span>' +
        '<span class="bd-item-price">' + price + '</span>' +
      '</label>';
    }

    function group(id, title, rows, count, note) {
      return '<div class="bd-group" data-pj-group="' + id + '">' +
        '<button type="button" class="bd-group-btn" aria-expanded="false">' +
          '<span class="bd-group-name">' + O.esc(title) + '</span>' +
          '<span class="bd-group-meta">' +
            '<span class="bd-group-count" data-pj-gcount hidden>0</span>' +
            '<span>' + count + '</span>' +
            '<svg class="bd-group-chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" ' +
              'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M5 8l5 5 5-5"/></svg>' +
          '</span>' +
        '</button>' +
        '<div class="bd-group-body"><div class="bd-group-inner">' +
          (note ? '<p class="pj-hint" style="padding:0 0 .6rem">' + O.esc(note) + '</p>' : '') +
          rows +
        '</div></div>' +
      '</div>';
    }

    var html = Object.keys(CAT.groups).map(function (g) {
      var items = CAT.oneTime.filter(function (i) { return i.group === g; });
      if (!items.length) return '';
      var rows = items.map(function (i) { return row(i, 'once', slug(i.name)); }).join('');
      return group(g, CAT.groups[g], rows, items.length, '');
    }).join('');

    if (CAT.monthly.length) {
      var mrows = CAT.monthly.map(function (m) { return row(m, 'monthly', slug(m.name)); }).join('');
      html += group('monthly', 'Monthly services', mrows, CAT.monthly.length,
        'Billed every month from the day the site goes live. Kept out of the one-time estimate so the two are never confused.');
    }

    host.innerHTML = html;

    [].forEach.call(host.querySelectorAll('[data-pj-group]'), function (grp) {
      var btn = grp.querySelector('.bd-group-btn');
      btn.addEventListener('click', function () {
        var open = grp.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    host.addEventListener('change', function (e) {
      var cb = e.target.closest ? e.target.closest('[data-pj-extra]') : null;
      if (!cb) return;
      var k = cb.getAttribute('data-pj-extra');
      var kind = cb.getAttribute('data-pj-kind');
      var bag = kind === 'monthly' ? picks.monthly : picks.extras;
      if (cb.checked) bag[k] = true; else delete bag[k];
      savePicks();
      var label = cb.closest('.bd-item');
      if (label && cb.checked) bump(label);
      paint();
    });

    if (global.SitehouseI18n && global.SitehouseI18n.paintPrices) {
      global.SitehouseI18n.paintPrices(host);
    }

    openGroupsWithPicks();
  }

  function openGroupsWithPicks() {
    [].forEach.call(root.querySelectorAll('[data-pj-group]'), function (grp) {
      var g = grp.getAttribute('data-pj-group');
      var has = g === 'monthly'
        ? CAT.monthly.some(function (m) { return picks.monthly[slug(m.name)]; })
        : CAT.oneTime.some(function (i) { return i.group === g && picks.extras[slug(i.name)]; });
      if (!has) return;
      grp.classList.add('is-open');
      var b = grp.querySelector('.bd-group-btn');
      if (b) b.setAttribute('aria-expanded', 'true');
    });
  }

  /* ══ The generated request ════════════════════════════════════
     Written from the selections, every time they change. Nothing in
     here is a worked example waiting to be edited — swap the package
     and every figure below follows. */
  function buildMessage() {
    var t = totals();
    var out = [];

    out.push('PROJECT REQUEST');
    out.push('');
    out.push('Hi Xovah, I would like to start a website project.');
    out.push('');

    out.push('PACKAGE');
    out.push(t.tier ? t.tier.name + ' — ' + money(t.tier.cents)
                    : '(no package selected yet)');
    out.push('');

    out.push('EXTRAS');
    if (t.extras.length) {
      t.extras.forEach(function (i) {
        out.push('• ' + i.name + ' — ' + (i.from ? 'from ' : '') + money(i.cents));
      });
    } else {
      out.push('None');
    }
    out.push('');

    out.push('ESTIMATED TOTAL');
    out.push(money(t.total) + (showingEuro() ? '' : ' (billed in ' + euro(t.total) + ')'));
    out.push('');

    if (t.monthly.length) {
      out.push('MONTHLY SERVICES');
      t.monthly.forEach(function (m) {
        out.push('• ' + m.name + ' — ' + money(m.cents) + ' / month');
      });
      out.push('Monthly total: ' + money(t.monthlyCents) + ' / month, from launch');
      out.push('');
    }

    out.push('WHAT I NEED');
    out.push(brief.text.trim() || '(not filled in yet)');

    var extra = [
      ['Business / project name', brief.businessName],
      ['Website type', brief.siteType],
      ['Preferred style', brief.style],
      ['Colour preferences', brief.colours],
      ['Features needed', brief.features],
      ['Reference websites', brief.references],
      ['Anything else', brief.notes]
    ].filter(function (p) { return p[1] && p[1].trim(); });

    if (extra.length) {
      out.push('');
      out.push('PROJECT DETAILS');
      extra.forEach(function (p) { out.push(p[0] + ': ' + p[1].trim()); });
    }

    return out.join('\n');
  }

  /* ══ Paint ════════════════════════════════════════════════════ */
  function set(sel, text) {
    var el = one(sel);
    if (el) el.textContent = text;
  }

  var lastTotal = null;

  function paint() {
    var t = totals();

    /* Summary — package */
    var packRow = root.querySelector('[data-pj-sum-pack]');
    if (packRow) {
      packRow.innerHTML = t.tier
        ? '<span>' + O.esc(t.tier.name) + '</span><b>' + money(t.tier.cents) + '</b>'
        : '<span class="pj-sum-none" style="margin:0">Nothing chosen yet</span>';
    }

    /* Summary — extras */
    var exHost = root.querySelector('[data-pj-sum-extras]');
    if (exHost) {
      exHost.innerHTML = t.extras.length
        ? t.extras.map(function (i) {
            return '<li><span>' + O.esc(i.name) + '</span><b>' + money(i.cents) + '</b></li>';
          }).join('')
        : '<li class="pj-sum-none" style="display:block">None selected</li>';
    }

    /* Summary — monthly, only when there is one */
    var monWrap = root.querySelector('[data-pj-sum-monthly]');
    if (monWrap) {
      monWrap.hidden = !t.monthly.length;
      var monHost = root.querySelector('[data-pj-sum-monthly-list]');
      if (monHost && t.monthly.length) {
        monHost.innerHTML = t.monthly.map(function (m) {
          return '<li><span>' + O.esc(m.name) + '</span><b>' + money(m.cents) + '/mo</b></li>';
        }).join('');
      }
    }

    set('[data-pj-total]', money(t.total));
    set('[data-pj-bar-total]', money(t.total));

    var count = t.extras.length;
    set('[data-pj-count]', count + (count === 1 ? ' extra' : ' extras'));

    var sub = t.tier
      ? t.tier.name + (count ? ' + ' + count + ' extra' + (count === 1 ? '' : 's') : '')
      : 'Choose a package to start';
    set('[data-pj-bar-sub]', sub);

    /* The total earns a small nudge when it changes, and only then. */
    if (lastTotal !== null && lastTotal !== t.total) {
      [].forEach.call(all('[data-pj-total], [data-pj-bar-total]'), bump);
    }
    lastTotal = t.total;

    /* Group counters */
    [].forEach.call(root.querySelectorAll('[data-pj-group]'), function (grp) {
      var g = grp.getAttribute('data-pj-group');
      var n = g === 'monthly'
        ? CAT.monthly.filter(function (m) { return picks.monthly[slug(m.name)]; }).length
        : CAT.oneTime.filter(function (i) { return i.group === g && picks.extras[slug(i.name)]; }).length;
      var badge = grp.querySelector('[data-pj-gcount]');
      if (badge) { badge.textContent = n; badge.hidden = !n; }
    });

    /* Progress rail */
    var steps = [
      !!t.tier,
      !!t.tier,                                   // customising is optional
      !!brief.text.trim(),
      EMAIL_RE.test(brief.email.trim())
    ];
    [].forEach.call(root.querySelectorAll('[data-pj-step]'), function (li, i) {
      li.classList.toggle('is-done', !!steps[i]);
    });

    /* The generated message */
    var pre = root.querySelector('[data-pj-preview]');
    if (pre) pre.textContent = buildMessage();

    /* The send button says what is still missing rather than sitting
       there greyed out with no explanation. */
    var ready = !!t.tier && !!brief.text.trim() && EMAIL_RE.test(brief.email.trim());
    [].forEach.call(all('[data-pj-send]'), function (b) {
      b.disabled = !ready || sending;
    });

    var clear = one('[data-pj-clear]');
    if (clear) clear.hidden = !t.tier && !count && !brief.text.trim();
  }

  function bump(el) {
    if (!el) return;
    el.classList.remove('pj-bump');
    /* Reading offsetWidth restarts the animation; without it a second
       change inside the same frame does nothing visible. */
    void el.offsetWidth;
    el.classList.add('pj-bump');
  }

  /* ══ The brief ════════════════════════════════════════════════ */
  function wireBrief() {
    var map = {
      'pj-brief': 'text',
      'pj-email': 'email',
      'pj-business': 'businessName',
      'pj-type': 'siteType',
      'pj-style': 'style',
      'pj-colours': 'colours',
      'pj-features': 'features',
      'pj-references': 'references',
      'pj-notes': 'notes'
    };

    Object.keys(map).forEach(function (id) {
      var el = doc.getElementById(id);
      if (!el) return;
      var key = map[id];
      el.value = brief[key] || '';
      el.addEventListener('input', function () {
        brief[key] = el.value;
        el.removeAttribute('aria-invalid');
        saveBrief();
        if (id === 'pj-brief') countBrief();
        paint();
      });
    });

    countBrief();
  }

  function countBrief() {
    var el = doc.getElementById('pj-brief');
    var out = one('[data-pj-brief-count]');
    if (!el || !out) return;
    var n = el.value.trim().length;
    out.textContent = n
      ? n + ' character' + (n === 1 ? '' : 's') + (n < 80 ? ' — a little more detail helps' : '')
      : '';
  }

  /* ══ Send ═════════════════════════════════════════════════════ */
  var sending = false;

  function note(kind, html) {
    var el = one('[data-pj-note]');
    if (!el) return;
    el.className = 'pj-note' + (kind === 'bad' ? ' is-bad' : '');
    el.innerHTML = html;
    el.hidden = false;
  }
  function clearNote() {
    var el = one('[data-pj-note]');
    if (el) el.hidden = true;
  }

  function focusProblem() {
    var t = totals();
    if (!t.tier) {
      var step = one('[data-pj-step-packages]');
      if (step) step.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var el = !brief.text.trim() ? doc.getElementById('pj-brief') : doc.getElementById('pj-email');
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  }

  function send() {
    if (sending) return;

    var t = totals();
    var problems = [];
    if (!t.tier) problems.push('a package');
    if (!brief.text.trim()) problems.push('a description of what you need');
    if (!EMAIL_RE.test(brief.email.trim())) problems.push('an email address we can reply to');

    if (problems.length) {
      note('bad', 'We still need ' + problems.join(', ').replace(/,([^,]*)$/, ' and$1') + '.');
      focusProblem();
      paint();
      return;
    }

    sending = true;
    paint();
    note('info', 'Sending your project request…');

    var payload = {
      email: brief.email.trim(),
      // The honeypot the real form leaves empty.
      company: '',
      project: {
        package: { key: t.tier.key, name: t.tier.name, cents: t.tier.cents },
        extras: t.extras.map(function (i) { return { name: i.name, cents: i.cents }; }),
        monthly: t.monthly.map(function (m) { return { name: m.name, cents: m.cents }; }),
        totalCents: t.total,
        monthlyCents: t.monthlyCents,
        brief: brief.text.trim(),
        details: {
          businessName: brief.businessName.trim(),
          siteType: brief.siteType.trim(),
          style: brief.style.trim(),
          colours: brief.colours.trim(),
          features: brief.features.trim(),
          references: brief.references.trim(),
          notes: brief.notes.trim()
        }
      }
    };

    global.fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.ok) { succeed(t); return; }

      /* 503 means the mail service is not configured; anything else is
         a real failure. Either way it did not arrive, so say so rather
         than showing a tick this page has not earned. The copy button
         is the way out — their work is not lost. */
      note('bad', r.status === 503
        ? '<strong>Sending is temporarily unavailable.</strong> Your request was not delivered. ' +
          'Nothing you typed is lost — copy the request above and we will pick it up from there.'
        : r.status === 429
          ? '<strong>That is a few too many in a row.</strong> Give it a minute and press send again.'
          : '<strong>That did not send.</strong> Your request was not delivered. ' +
            'Nothing you typed is lost — try again in a moment.');
    })['catch'](function () {
      note('bad', '<strong>No connection.</strong> Your request was not delivered, and nothing ' +
                  'you typed is lost. Check your internet and press send again.');
    }).then(function () {
      sending = false;
      paint();
    });
  }

  /* ══ Success ══════════════════════════════════════════════════ */
  function succeed(t) {
    var done = one('[data-pj-done]');
    var form = one('[data-pj-form]');
    if (!done || !form) return;

    root.querySelector('[data-pj-done-pack]').textContent =
      t.tier.name + ' — ' + money(t.tier.cents);
    root.querySelector('[data-pj-done-extras]').textContent =
      t.extras.length
        ? t.extras.length + (t.extras.length === 1 ? ' extra' : ' extras') + ' — ' + money(t.extrasCents)
        : 'None';
    root.querySelector('[data-pj-done-total]').textContent = money(t.total);

    var monRow = root.querySelector('[data-pj-done-monthly]');
    if (monRow) {
      monRow.hidden = !t.monthly.length;
      if (t.monthly.length) {
        root.querySelector('[data-pj-done-monthly-v]').textContent =
          money(t.monthlyCents) + ' / month';
      }
    }

    /* The basket is spent. Leaving it would mean a second visit opens
       with a request that has already been sent, which reads as a
       mistake the first time and as a duplicate the second. */
    picks = { tier: null, extras: {}, monthly: {} };
    brief.text = '';
    savePicks();
    saveBrief();

    form.hidden = true;
    var bar = one('[data-pj-bar]');
    if (bar) { bar.hidden = true; bar.style.display = 'none'; }

    done.hidden = false;
    done.classList.add('pj-enter');
    global.scrollTo({ top: 0, behavior: 'smooth' });

    // Announced, so a screen reader is told the thing actually landed.
    done.setAttribute('tabindex', '-1');
    done.focus({ preventScroll: true });
  }

  /* ══ Wiring ═══════════════════════════════════════════════════ */
  function wire() {
    [].forEach.call(all('[data-pj-send]'), function (b) {
      b.addEventListener('click', send);
    });

    var jump = one('[data-pj-jump]');
    if (jump) {
      jump.addEventListener('click', function () {
        var el = doc.getElementById('pj-brief');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); }
      });
    }

    var copy = one('[data-pj-copy]');
    if (copy) {
      copy.addEventListener('click', function () {
        var text = buildMessage();
        var done = function () {
          copy.textContent = 'Copied';
          global.setTimeout(function () { copy.textContent = 'Copy'; }, 1800);
        };
        if (global.navigator && global.navigator.clipboard) {
          global.navigator.clipboard.writeText(text).then(done, fallback);
        } else { fallback(); }

        function fallback() {
          /* execCommand is deprecated, and it is also the only thing
             that works without a secure context or permission. */
          var ta = doc.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0';
          doc.body.appendChild(ta);
          ta.select();
          try { doc.execCommand('copy'); done(); } catch (e) { /* nothing to offer */ }
          doc.body.removeChild(ta);
        }
      });
    }

    var clear = one('[data-pj-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        picks = { tier: null, extras: {}, monthly: {} };
        savePicks();
        [].forEach.call(root.querySelectorAll('[data-pj-tier]'), function (r) { r.checked = false; });
        [].forEach.call(root.querySelectorAll('[data-pj-extra]'), function (c) { c.checked = false; });
        [].forEach.call(root.querySelectorAll('[data-pj-group]'), function (g) {
          g.classList.remove('is-open');
          var b = g.querySelector('.bd-group-btn');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        markTiers();
        clearNote();
        paint();
      });
    }
  }

  /* A link from the pricing page arrives with its choice already made:
     /start?package=full. Anything unrecognised is ignored rather than
     clearing what the visitor already had. */
  function fromQuery() {
    var want;
    try {
      want = new global.URLSearchParams(global.location.search).get('package');
    } catch (e) { return; }
    if (!want || !TIERS[want]) return;
    picks.tier = want;
    savePicks();
  }

  function init() {
    loadPicks();
    loadBrief();
    fromQuery();

    renderTiers();
    renderExtras();
    wireBrief();
    wire();
    markTiers();
    paint();
  }

  // Re-format every figure when the currency changes.
  doc.addEventListener('xovah:i18n', paint);
  doc.addEventListener('sitehouse:i18n', paint);

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  global.XovahProject = {
    totals: totals,
    message: buildMessage,
    picks: function () { return picks; }
  };
})(window);
