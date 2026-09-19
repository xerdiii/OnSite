/* ───────────────────────────────────────────────────────────────
   Xovah — the project builder on build.html

   Choose → see what it covers → add what it does not → send.

   A package is chosen first because everything below it depends on
   which one: the panel of things already paid for, and the list of
   extras still worth buying. An extra a package already covers is
   never offered for sale here, and is un-ticked if it was ticked
   before the package changed.

   Prices come from Sitehouse.CATALOG and live nowhere else.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc  = global.document;
  var root = doc.querySelector('[data-b]');
  if (!root) return;

  var O = global.Sitehouse;
  if (!O || !O.CATALOG) return;

  var CAT      = O.CATALOG;
  var ENDPOINT = '/api/contact';
  var INBOX    = 'hello@xovahweb.com';

  /* Shared with anything else that builds a basket, so picks survive a
     wander off to the extras page and back. */
  var PICKS_KEY = 'sitehouse.build';
  var BRIEF_KEY = 'sitehouse.brief';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* The phone bar is fixed, so it sits outside <main> and a lookup
     scoped to the builder would miss it. */
  function q(sel)  { return root.querySelector(sel) || doc.querySelector(sel); }
  function qa(sel) { return doc.querySelectorAll(sel); }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* Packages carrying a real figure. Anything quoted case by case is a
     conversation, not a card. */
  var TIERS = {};
  var TIER_LIST = [];
  CAT.websites.forEach(function (w) {
    if (w.cents > 0) { TIERS[w.key] = w; TIER_LIST.push(w); }
  });

  var ONCE_BY_KEY = {};
  CAT.oneTime.forEach(function (i) { ONCE_BY_KEY[slug(i.name)] = i; });

  var GROUPS = Object.keys(CAT.groups);

  /* ── State ─────────────────────────────────────────────────── */
  var picks = { tier: null, extras: {} };
  var brief = {
    text: '', email: '',
    businessName: '', siteType: '', style: '', colours: '',
    features: '', references: '', notes: '', filesLink: ''
  };
  var tab = 'all';
  var sending = false;
  var lastTotal = null;

  /* ── Storage ───────────────────────────────────────────────── */
  function loadPicks() {
    try {
      var v = JSON.parse(global.localStorage.getItem(PICKS_KEY) || 'null');
      if (!v || typeof v !== 'object') return;
      picks.tier = TIERS[v.tier] ? v.tier : null;
      picks.extras = (v.extras && typeof v.extras === 'object') ? v.extras : {};
    } catch (e) { /* private mode, corrupt JSON — start clean */ }
  }
  function savePicks() {
    try { global.localStorage.setItem(PICKS_KEY, JSON.stringify(picks)); } catch (e) {}
  }
  function loadBrief() {
    try {
      var v = JSON.parse(global.localStorage.getItem(BRIEF_KEY) || 'null');
      if (!v || typeof v !== 'object') return;
      Object.keys(brief).forEach(function (k) {
        if (typeof v[k] === 'string') brief[k] = v[k];
      });
    } catch (e) {}
  }
  function saveBrief() {
    try { global.localStorage.setItem(BRIEF_KEY, JSON.stringify(brief)); } catch (e) {}
  }

  /* ── Money ─────────────────────────────────────────────────── */
  function money(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }
  function euro(cents) { return '€' + (cents / 100).toFixed(2); }
  function showingEuro() {
    return !global.SitehouseI18n || global.SitehouseI18n.currency === 'EUR';
  }
  function repaintPrices(el) {
    if (global.SitehouseI18n && global.SitehouseI18n.paintPrices) {
      global.SitehouseI18n.paintPrices(el);
    }
  }

  /* ── What the chosen package already covers ────────────────── */
  function coveredKeys() {
    var names = (picks.tier && CAT.included && CAT.included[picks.tier]) || [];
    var out = {};
    names.forEach(function (n) {
      var k = slug(n);
      if (ONCE_BY_KEY[k]) out[k] = true;
    });
    return out;
  }
  function coveredItems() {
    var c = coveredKeys();
    return Object.keys(c).map(function (k) { return ONCE_BY_KEY[k]; });
  }

  /* Extras still worth offering: everything the package does not
     already pay for. */
  function sellableItems() {
    var c = coveredKeys();
    return CAT.oneTime.filter(function (i) { return !c[slug(i.name)]; });
  }

  function chosenExtras() {
    var c = coveredKeys();
    return Object.keys(picks.extras)
      .filter(function (k) { return picks.extras[k] && ONCE_BY_KEY[k] && !c[k]; })
      .map(function (k) { return ONCE_BY_KEY[k]; });
  }

  function totals() {
    var tier = picks.tier ? TIERS[picks.tier] : null;
    var once = chosenExtras();
    var extrasCents = once.reduce(function (n, i) { return n + i.cents; }, 0);
    return {
      tier: tier,
      extras: once,
      extrasCents: extrasCents,
      total: (tier ? tier.cents : 0) + extrasCents
    };
  }

  /* Anything the new package covers is dropped from the basket, so the
     total never charges for something the package already includes. */
  function dropCovered() {
    var c = coveredKeys();
    Object.keys(picks.extras).forEach(function (k) {
      if (c[k]) delete picks.extras[k];
    });
  }

  var TICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.8" ' +
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
             '<path d="M3.4 8.4l3 3 6.2-6.6"/></svg>';

  /* ══ Stage 1 — the packages ═══════════════════════════════════ */
  function renderPacks() {
    var host = root.querySelector('[data-b-packs]');
    if (!host) return;

    host.innerHTML = TIER_LIST.map(function (w) {
      var on = picks.tier === w.key;
      return '' +
        '<label class="bx-pack' + (on ? ' is-on' : '') + '" data-b-pack="' + w.key + '">' +
          '<input type="radio" name="b-tier" value="' + w.key + '" data-b-tier' + (on ? ' checked' : '') + '>' +
          '<span class="bx-pack-box">' +
            '<span class="bx-pack-top">' +
              '<span class="bx-pack-name">' + O.esc(w.name) + '</span>' +
              '<span class="bx-pack-tick" aria-hidden="true">' + TICK + '</span>' +
            '</span>' +
            '<span class="bx-pack-price">' +
              '<b class="cur" data-eur="' + (w.cents / 100) + '">' + money(w.cents) + '</b>' +
              '<span class="bx-pack-flag">one-time</span>' +
            '</span>' +
            '<span class="bx-pack-blurb">' + O.esc(w.blurb) + '</span>' +
            '<span class="bx-pack-note">' + O.esc(w.note) + '</span>' +
          '</span>' +
        '</label>';
    }).join('');

    host.addEventListener('change', function (e) {
      var r = e.target.closest ? e.target.closest('[data-b-tier]') : null;
      if (!r || !r.checked) return;
      picks.tier = r.value;
      dropCovered();
      savePicks();
      markPacks();
      renderIncluded();
      renderTabs();
      renderAdds();
      paint();

      var card = host.querySelector('[data-b-pack="' + r.value + '"]');
      if (card) bump(card);

      /* Step two is the whole point of choosing, so go there — but not
         on the first paint, only on a real click. */
      var stage = root.querySelector('[data-b-stage-extras]');
      if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    repaintPrices(host);
  }

  function markPacks() {
    [].forEach.call(root.querySelectorAll('[data-b-pack]'), function (card) {
      card.classList.toggle('is-on', card.getAttribute('data-b-pack') === picks.tier);
    });
  }

  /* ══ Stage 2a — what the package already covers ═══════════════ */
  function renderIncluded() {
    var box = root.querySelector('[data-b-incl]');
    if (!box) return;

    var tier = picks.tier ? TIERS[picks.tier] : null;
    if (!tier) { box.hidden = true; return; }

    var nameEl = box.querySelector('[data-b-incl-name]');
    if (nameEl) nameEl.textContent = tier.name;

    var list = box.querySelector('[data-b-incl-list]');
    if (list) {
      list.innerHTML = (tier.includes || []).map(function (line) {
        return '<li>' + TICK + '<span>' + O.esc(line) + '</span></li>';
      }).join('');
    }

    /* The extras this package pays for. Worth naming individually,
       because these are the ones people otherwise buy twice. */
    var free = coveredItems();
    var wrap = box.querySelector('[data-b-free-wrap]');
    var freeList = box.querySelector('[data-b-free-list]');
    var saved = box.querySelector('[data-b-saved]');

    if (wrap && freeList) {
      if (!free.length) {
        wrap.hidden = true;
      } else {
        freeList.innerHTML = free.map(function (i) {
          return '<li>' + TICK + '<span><s>' + O.esc(i.name) + '</s> ' +
                 '<em class="cur" data-eur="' + (i.cents / 100) + '">' + money(i.cents) + '</em></span></li>';
        }).join('');

        var sum = free.reduce(function (n, i) { return n + i.cents; }, 0);
        if (saved) {
          saved.innerHTML = 'That is <b class="cur" data-eur="' + (sum / 100) + '">' +
                            money(sum) + '</b> of extras you do not have to buy.';
        }
        wrap.hidden = false;
        repaintPrices(wrap);
      }
    }

    box.hidden = false;
  }

  /* ══ Stage 2b — the extras you can still add ══════════════════ */
  function renderTabs() {
    var host = root.querySelector('[data-b-tabs]');
    if (!host) return;

    var sellable = sellableItems();
    var counts = {};
    GROUPS.forEach(function (g) {
      counts[g] = sellable.filter(function (i) { return i.group === g; }).length;
    });

    var btns = [{ id: 'all', label: 'All', n: sellable.length }];
    GROUPS.forEach(function (g) {
      if (counts[g]) btns.push({ id: g, label: CAT.groups[g], n: counts[g] });
    });

    /* A tab can disappear when the package changes — fall back rather
       than leaving an empty grid with no tab lit. */
    if (!btns.some(function (b) { return b.id === tab; })) tab = 'all';

    host.innerHTML = btns.map(function (b) {
      var picked = b.id === 'all'
        ? chosenExtras().length
        : chosenExtras().filter(function (i) { return i.group === b.id; }).length;
      return '<button type="button" role="tab" class="bx-tab' + (tab === b.id ? ' is-on' : '') + '" ' +
             'data-b-tab="' + b.id + '" aria-selected="' + (tab === b.id) + '">' +
               O.esc(b.label) + '<i>' + b.n + '</i>' +
               (picked ? '<b>' + picked + '</b>' : '') +
             '</button>';
    }).join('');
  }

  function renderAdds() {
    var host = root.querySelector('[data-b-adds]');
    if (!host) return;

    var items = sellableItems().filter(function (i) {
      return tab === 'all' || i.group === tab;
    });

    if (!items.length) {
      host.innerHTML = '<p class="bx-adds-empty">Your package already covers everything in here.</p>';
      return;
    }

    host.innerHTML = items.map(function (i) {
      var k  = slug(i.name);
      var on = !!picks.extras[k];
      return '' +
        '<label class="bx-add' + (on ? ' is-on' : '') + '" data-b-add="' + k + '">' +
          '<input type="checkbox" data-b-extra="' + k + '"' + (on ? ' checked' : '') + '>' +
          '<span class="bx-add-box">' +
            '<span class="bx-add-tick" aria-hidden="true">' + TICK + '</span>' +
            '<span class="bx-add-body">' +
              '<span class="bx-add-name">' + O.esc(i.name) + '</span>' +
              '<span class="bx-add-price">' + (i.from ? 'from ' : '') +
                '<span class="cur" data-eur="' + (i.cents / 100) + '">' + money(i.cents) + '</span>' +
              '</span>' +
            '</span>' +
          '</span>' +
        '</label>';
    }).join('');

    repaintPrices(host);
  }

  /* ══ The letter ═══════════════════════════════════════════════ */
  function buildMessage() {
    var t = totals();
    var out = [];

    out.push('PROJECT REQUEST');
    out.push('');
    out.push('Hi Xovah, I would like to start a website project.');
    out.push('');

    out.push('PACKAGE');
    out.push(t.tier ? t.tier.name + ' — ' + money(t.tier.cents) : '(no package selected yet)');
    out.push('');

    var free = coveredItems();
    if (free.length) {
      out.push('ALREADY INCLUDED IN THIS PACKAGE');
      free.forEach(function (i) { out.push('• ' + i.name); });
      out.push('');
    }

    out.push('EXTRAS ADDED');
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

    out.push('WHAT I NEED');
    out.push(brief.text.trim() || '(not filled in yet)');

    var extra = [
      ['Business / project name', brief.businessName],
      ['Website type',            brief.siteType],
      ['Preferred style',         brief.style],
      ['Colour preferences',      brief.colours],
      ['Features needed',         brief.features],
      ['Reference websites',      brief.references],
      ['Anything else',           brief.notes]
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
    var el = q(sel);
    if (el) el.textContent = text;
  }

  function paint() {
    var t = totals();
    var count = t.extras.length;

    /* Stages two and three mean nothing without a package. */
    var locked = !t.tier;
    [].forEach.call(root.querySelectorAll('[data-b-stage-extras], [data-b-stage-send]'), function (s) {
      s.classList.toggle('is-locked', locked);
    });

    /* Tally — package */
    var packRow = root.querySelector('[data-b-tally-pack]');
    if (packRow) {
      packRow.innerHTML = t.tier
        ? '<span>' + O.esc(t.tier.name) + '</span><b>' + money(t.tier.cents) + '</b>'
        : '<span class="bx-tally-none">Nothing chosen yet</span>';
    }

    /* Tally — extras */
    var exHost = root.querySelector('[data-b-tally-extras]');
    if (exHost) {
      exHost.innerHTML = count
        ? t.extras.map(function (i) {
            return '<li><span>' + O.esc(i.name) + '</span><b>' + money(i.cents) + '</b></li>';
          }).join('')
        : '<li class="bx-tally-none">None added</li>';
    }

    set('[data-b-total]', money(t.total));
    set('[data-b-bar-total]', money(t.total));
    set('[data-b-count]', count + (count === 1 ? ' extra' : ' extras'));
    set('[data-b-bar-sub]', t.tier
      ? t.tier.name + (count ? ' + ' + count + ' extra' + (count === 1 ? '' : 's') : '')
      : 'Choose a package to start');

    if (lastTotal !== null && lastTotal !== t.total) {
      [].forEach.call(qa('[data-b-total], [data-b-bar-total]'), bump);
    }
    lastTotal = t.total;

    /* Progress rail */
    var done = [
      !!t.tier,
      !!t.tier,                                    // the extras are optional
      !!t.tier && !!brief.text.trim() && EMAIL_RE.test(brief.email.trim())
    ];
    [].forEach.call(root.querySelectorAll('[data-b-step]'), function (li, i) {
      li.classList.toggle('is-done', !!done[i]);
    });

    /* The envelope */
    var pre = root.querySelector('[data-b-preview]');
    if (pre) pre.textContent = buildMessage();

    var from = root.querySelector('[data-b-mail-from]');
    if (from) {
      var typed = brief.email.trim();
      from.textContent = typed || 'your email address';
      from.classList.toggle('is-waiting', !typed);
    }
    set('[data-b-mail-subject]',
        'Project request' + (t.tier ? ' — ' + t.tier.name : '') +
        (t.total ? ' — ' + money(t.total) : ''));

    var ready = !!t.tier && !!brief.text.trim() && EMAIL_RE.test(brief.email.trim());
    [].forEach.call(qa('[data-b-send]'), function (b) { b.disabled = !ready || sending; });

    var clear = q('[data-b-clear]');
    if (clear) clear.hidden = !t.tier && !count && !brief.text.trim();
  }

  function bump(el) {
    if (!el) return;
    el.classList.remove('bx-bump');
    void el.offsetWidth;                 // restarts the animation
    el.classList.add('bx-bump');
  }

  /* ══ The form ═════════════════════════════════════════════════ */
  var FIELDS = {
    'b-business':   'businessName',
    'b-email':      'email',
    'b-brief':      'text',
    'b-fileslink':  'filesLink',
    'b-type':       'siteType',
    'b-style':      'style',
    'b-colours':    'colours',
    'b-features':   'features',
    'b-references': 'references',
    'b-notes':      'notes'
  };

  /* ── Attachments ─────────────────────────────────────────────
     Read here only to show the visitor what will go and to catch the
     over-limit case before they fill in the rest of the form. The
     server re-checks all of it; nothing below is a security control.
     Files are deliberately NOT persisted to localStorage — a few
     megabytes of base64 would blow the quota and take the basket with
     it. Re-picking after a refresh is the cost. */
  var MAX_FILES = 3;
  var MAX_BYTES = 3 * 1024 * 1024;
  var picked = [];                        // [{ name, size, content }]

  function kb(n) {
    return n < 1024 * 1024
      ? Math.round(n / 1024) + ' KB'
      : (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function readAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        // dataURL is "data:application/pdf;base64,XXXX" — keep the tail.
        var s = String(r.result);
        var i = s.indexOf(',');
        resolve(i < 0 ? '' : s.slice(i + 1));
      };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(file);
    });
  }

  function wireFiles() {
    var input = doc.getElementById('b-files');
    var list = q('[data-b-files]');
    if (!input || !list) return;

    input.addEventListener('change', function () {
      var chosen = [].slice.call(input.files || []);
      var problems = [];
      picked = [];

      /* Message and filename stay separate text nodes. i18n.js translates
         a node whole, so a sentence built by concatenating a filename
         into it would never match a dictionary key. */
      if (chosen.length > MAX_FILES) {
        problems.push({ msg: 'Only the first three files were taken.', detail: '' });
        chosen = chosen.slice(0, MAX_FILES);
      }

      var total = 0;
      var keep = [];
      chosen.forEach(function (f) {
        var isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        if (!isPdf) { problems.push({ msg: 'That file is not a PDF.', detail: f.name }); return; }
        if (total + f.size > MAX_BYTES) {
          problems.push({
            msg: 'Over the 3 MB limit — send this one as a link instead.',
            detail: f.name + ' (' + kb(f.size) + ')'
          });
          return;
        }
        total += f.size;
        keep.push(f);
      });

      render(keep, problems);

      Promise.all(keep.map(function (f) {
        return readAsBase64(f).then(function (content) {
          return { name: f.name, size: f.size, content: content };
        });
      })).then(function (out) {
        picked = out.filter(function (x) { return x.content; });
      })['catch'](function () {
        picked = [];
        render([], [{ msg: 'Those files could not be read. Try again, or send a link.', detail: '' }]);
      });
    });

    function render(files, problems) {
      var rows = files.map(function (f) {
        return '<li><span>' + O.esc(f.name) + '</span><b>' + kb(f.size) + '</b></li>';
      }).concat(problems.map(function (p) {
        return '<li class="is-bad"><span>' + O.esc(p.msg) + '</span>' +
               (p.detail ? '<b>' + O.esc(p.detail) + '</b>' : '') + '</li>';
      }));
      list.innerHTML = rows.join('');
      list.hidden = !rows.length;
    }
  }

  function wireForm() {
    Object.keys(FIELDS).forEach(function (id) {
      var el = doc.getElementById(id);
      if (!el) return;
      var key = FIELDS[id];
      el.value = brief[key] || '';
      el.addEventListener('input', function () {
        brief[key] = el.value;
        el.removeAttribute('aria-invalid');
        saveBrief();
        if (id === 'b-brief') countBrief();
        paint();
      });
    });
    countBrief();
  }

  function countBrief() {
    var el  = doc.getElementById('b-brief');
    var out = q('[data-b-brief-count]');
    if (!el || !out) return;
    var n = el.value.trim().length;
    out.textContent = n
      ? n + ' character' + (n === 1 ? '' : 's') + (n < 80 ? ' — a little more detail helps' : '')
      : '';
  }

  /* ══ Send ═════════════════════════════════════════════════════ */
  function note(kind, html) {
    var el = q('[data-b-note]');
    if (!el) return;
    el.className = 'bx-note' + (kind === 'bad' ? ' is-bad' : kind === 'ask' ? ' is-ask' : '');
    el.innerHTML = html;
    el.hidden = false;
  }
  function clearNote() {
    var el = q('[data-b-note]');
    if (el) el.hidden = true;
  }

  /* ── The last check before it leaves ──────────────────────────
     Not a browser confirm(): those are easy to dismiss without
     reading, and they cannot show what is actually being sent. This
     names the package, the count, the total and the address, and the
     visitor has to press the button a second time. */
  var confirmed = false;

  function askToConfirm(t) {
    var count = t.extras.length;
    note('ask',
      '<b>Send this to Xovah?</b>' +
      '<span class="bx-confirm-lines">' +
        '<span><i>Package</i>' + O.esc(t.tier.name) + '</span>' +
        '<span><i>Extras</i>' + (count ? count + (count === 1 ? ' extra' : ' extras') : 'None') + '</span>' +
        '<span><i>Total</i>' + money(t.total) + '</span>' +
        '<span><i>Reply to</i>' + O.esc(brief.email.trim()) + '</span>' +
      '</span>' +
      '<span class="bx-confirm-act">' +
        '<button type="button" class="bx-confirm-yes" data-b-confirm>Yes, send it</button>' +
        '<button type="button" class="bx-confirm-no" data-b-cancel>Not yet</button>' +
      '</span>');

    var el = q('[data-b-note]');
    if (!el) return;
    var yes = el.querySelector('[data-b-confirm]');
    var no  = el.querySelector('[data-b-cancel]');
    if (yes) yes.addEventListener('click', function () { confirmed = true; send(); });
    if (no)  no.addEventListener('click', function () { confirmed = false; clearNote(); });
    if (yes) yes.focus();
  }

  /* When sending fails there is a request on screen that took somebody
     ten minutes to build. This hands it to their own mail app so the
     work reaches us either way. Long mailto: bodies get truncated by
     Windows and some clients, so it is capped. */
  function mailHref() {
    var t = totals();
    return 'mailto:' + INBOX +
      '?subject=' + encodeURIComponent('Project request' + (t.tier ? ' - ' + t.tier.name : '')) +
      '&body='    + encodeURIComponent(buildMessage().slice(0, 1400));
  }
  function mailLink() {
    return ' <a href="' + mailHref() + '">Send it as an email instead</a> — it reaches us at ' + INBOX + '.';
  }

  function focusProblem() {
    if (!picks.tier) {
      var stage = root.querySelector('[data-b-stage-packs]');
      if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var el = !brief.text.trim() ? doc.getElementById('b-brief') : doc.getElementById('b-email');
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
    if (!t.tier)                               problems.push('a package');
    if (!brief.text.trim())                    problems.push('a description of what you need');
    if (!EMAIL_RE.test(brief.email.trim()))    problems.push('an email address we can reply to');

    if (problems.length) {
      note('bad', 'We still need ' + problems.join(', ').replace(/,([^,]*)$/, ' and$1') + '.');
      focusProblem();
      paint();
      return;
    }

    /* One deliberate pause before it goes. The request took real effort
       to build and cannot be unsent, so the last click is asked for
       rather than assumed — and it names what is about to leave. */
    if (!confirmed) {
      askToConfirm(t);
      return;
    }
    confirmed = false;

    sending = true;
    paint();
    note('info', 'Sending your project request…');

    var payload = {
      email: brief.email.trim(),
      company: '',                            // the honeypot a real person leaves empty
      project: {
        package: { key: t.tier.key, name: t.tier.name, cents: t.tier.cents },
        extras:  t.extras.map(function (i) { return { name: i.name, cents: i.cents }; }),
        included: coveredItems().map(function (i) { return i.name; }),
        totalCents: t.total,
        files: picked.map(function (f) { return { filename: f.name, content: f.content }; }),
        brief: brief.text.trim(),
        details: {
          businessName: brief.businessName.trim(),
          siteType:     brief.siteType.trim(),
          style:        brief.style.trim(),
          colours:      brief.colours.trim(),
          features:     brief.features.trim(),
          references:   brief.references.trim(),
          notes:        brief.notes.trim(),
          filesLink:    brief.filesLink.trim()
        }
      }
    };

    global.fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.ok) { succeed(t); return; }

      /* 503 means the mail service is not configured; anything else is a
         real failure. Either way it did not arrive, so say so rather
         than showing a tick this page has not earned. */
      note('bad', r.status === 503
        ? '<strong>Sending is temporarily unavailable.</strong> Your request was not delivered.' + mailLink()
        : r.status === 429
          ? '<strong>That is a few too many in a row.</strong> Give it a minute and press send again.'
          : '<strong>That did not send.</strong> Your request was not delivered.' + mailLink());
    })['catch'](function () {
      note('bad', '<strong>No connection.</strong> Your request was not delivered, and nothing you ' +
                  'typed is lost. Check your internet and press send again.' + mailLink());
    }).then(function () {
      sending = false;
      paint();
    });
  }

  function succeed(t) {
    var done = q('[data-b-done]');
    var form = q('[data-b-form]');
    if (!done || !form) return;

    var packEl  = root.querySelector('[data-b-done-pack]');
    var exEl    = root.querySelector('[data-b-done-extras]');
    var totalEl = root.querySelector('[data-b-done-total]');

    if (packEl)  packEl.textContent  = t.tier.name + ' — ' + money(t.tier.cents);
    if (exEl)    exEl.textContent    = t.extras.length
      ? t.extras.length + (t.extras.length === 1 ? ' extra' : ' extras') + ' — ' + money(t.extrasCents)
      : 'None';
    if (totalEl) totalEl.textContent = money(t.total);

    /* The basket is spent. Leaving it would open a second visit with a
       request that has already been sent. */
    picks = { tier: null, extras: {} };
    brief.text = '';
    savePicks();
    saveBrief();

    form.hidden = true;
    var bar = q('[data-b-bar]');
    if (bar) bar.style.display = 'none';

    done.hidden = false;
    done.classList.add('bx-enter');
    global.scrollTo({ top: 0, behavior: 'smooth' });

    done.setAttribute('tabindex', '-1');
    done.focus({ preventScroll: true });
  }

  /* ══ Wiring ═══════════════════════════════════════════════════ */
  function wire() {
    /* Tabs and tick boxes are delegated, because both lists are redrawn
       whenever the package changes. */
    var tabs = root.querySelector('[data-b-tabs]');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-b-tab]') : null;
        if (!btn) return;
        tab = btn.getAttribute('data-b-tab');
        renderTabs();
        renderAdds();
      });
    }

    var adds = root.querySelector('[data-b-adds]');
    if (adds) {
      adds.addEventListener('change', function (e) {
        var cb = e.target.closest ? e.target.closest('[data-b-extra]') : null;
        if (!cb) return;
        var k = cb.getAttribute('data-b-extra');
        if (cb.checked) picks.extras[k] = true; else delete picks.extras[k];
        savePicks();

        var card = adds.querySelector('[data-b-add="' + k + '"]');
        if (card) {
          card.classList.toggle('is-on', cb.checked);
          if (cb.checked) bump(card);
        }
        renderTabs();
        paint();
      });
    }

    [].forEach.call(qa('[data-b-send]'), function (b) { b.addEventListener('click', send); });

    var jump = q('[data-b-jump]');
    if (jump) {
      jump.addEventListener('click', function () {
        if (!picks.tier) {
          var s = root.querySelector('[data-b-stage-packs]');
          if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        var el = doc.getElementById('b-brief');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus({ preventScroll: true });
        }
      });
    }

    var copy = q('[data-b-copy]');
    if (copy) {
      copy.addEventListener('click', function () {
        var text = buildMessage();
        var ok = function () {
          copy.textContent = 'Copied';
          global.setTimeout(function () { copy.textContent = 'Copy'; }, 1800);
        };
        if (global.navigator && global.navigator.clipboard) {
          global.navigator.clipboard.writeText(text).then(ok, fallback);
        } else { fallback(); }

        function fallback() {
          /* execCommand is deprecated, and it is also the only thing
             that works without a secure context. */
          var ta = doc.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0';
          doc.body.appendChild(ta);
          ta.select();
          try { doc.execCommand('copy'); ok(); } catch (e) {}
          doc.body.removeChild(ta);
        }
      });
    }

    var clear = q('[data-b-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        picks = { tier: null, extras: {} };
        tab = 'all';
        savePicks();
        clearNote();
        renderPacks();
        markPacks();
        renderIncluded();
        renderTabs();
        renderAdds();
        paint();
        var s = root.querySelector('[data-b-stage-packs]');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* A link from the pricing page arrives with its choice already made:
     build.html?package=full. Anything unrecognised is ignored rather
     than clearing what the visitor already had. */
  function fromQuery() {
    var want;
    try { want = new global.URLSearchParams(global.location.search).get('package'); }
    catch (e) { return; }
    if (!want || !TIERS[want]) return;
    picks.tier = want;
    dropCovered();
    savePicks();
  }

  function init() {
    loadPicks();
    loadBrief();
    fromQuery();
    dropCovered();

    renderPacks();
    renderIncluded();
    renderTabs();
    renderAdds();
    wireForm();
    wireFiles();
    wire();
    markPacks();
    paint();
  }

  // Re-format every figure when the currency switcher fires.
  doc.addEventListener('xovah:i18n', paint);
  doc.addEventListener('sitehouse:i18n', paint);

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  global.XovahBuilder = {
    totals: totals,
    message: buildMessage,
    picks: function () { return picks; }
  };
})(window);
