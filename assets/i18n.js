/* ───────────────────────────────────────────────────────────────
   Xovah — language and currency

   Two choices, kept together because they are made together, and both
   living in the menu rather than the bar: the top of the page is for
   the business, not for settings.

   LANGUAGE. Translation is keyed on the English source text rather
   than on data-i18n attributes sprinkled through the markup. That way
   nothing in the HTML has to change to add a language, and any string
   the dictionary has not learned yet simply stays in English instead
   of rendering as a missing key. The original text of every node is
   captured once, so switching back and forth is lossless.

   The dictionary covers the interface: navigation, headings, buttons,
   card copy, the catalogue's group names, the forms. Long-form prose —
   the FAQ answers, the terms, the privacy policy — is deliberately not
   machine-translated here; legal text that is subtly wrong in nine
   languages is worse than legal text in one. Those pages stay English
   and say so.

   CURRENCY. Every price on the site is authored in EUR and marked up
   as <span class="cur" data-eur="79.99">. Nothing else is stored. The
   rates below are indicative and fixed at build time — they are there
   so a visitor can recognise the size of a number in money they think
   in, not to quote them. Billing is in EUR, and the control says so.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var LKEY = 'xovah.lang';
  var SELF = (doc.currentScript && doc.currentScript.src) || '';
  var DICT_BASE = SELF ? SELF.replace(/i18n\.js(\?.*)?$/, 'i18n/') : 'assets/i18n/';
  var DICT_V = '1';
  var CKEY = 'xovah.currency';

  var LANGS = [
    { code: 'en', label: 'English',    locale: 'en-GB' },
    { code: 'sq', label: 'Shqip',      locale: 'sq-AL' },
    { code: 'de', label: 'Deutsch',    locale: 'de-DE' },
    { code: 'fr', label: 'Français',   locale: 'fr-FR' },
    { code: 'it', label: 'Italiano',   locale: 'it-IT' },
    { code: 'es', label: 'Español',    locale: 'es-ES' },
    { code: 'pt', label: 'Português',  locale: 'pt-PT' },
    { code: 'nl', label: 'Nederlands', locale: 'nl-NL' },
    { code: 'sv', label: 'Svenska',    locale: 'sv-SE' },
    { code: 'tr', label: 'Türkçe',     locale: 'tr-TR' }
  ];

  /* Indicative only. EUR is what you are actually billed in. */
  var CURRENCIES = [
    { code: 'EUR', label: 'Euro',            rate: 1,     whole: false },
    { code: 'USD', label: 'US dollar',       rate: 1.09,  whole: false },
    { code: 'GBP', label: 'British pound',   rate: 0.85,  whole: false },
    { code: 'CHF', label: 'Swiss franc',     rate: 0.95,  whole: false },
    { code: 'SEK', label: 'Swedish krona',   rate: 11.4,  whole: true  },
    { code: 'NOK', label: 'Norwegian krone', rate: 11.6,  whole: true  },
    { code: 'DKK', label: 'Danish krone',    rate: 7.46,  whole: true  },
    { code: 'PLN', label: 'Polish złoty',    rate: 4.30,  whole: true  },
    { code: 'TRY', label: 'Turkish lira',    rate: 38.0,  whole: true  },
    { code: 'ALL', label: 'Albanian lek',    rate: 98.0,  whole: true  }
  ];

  /* ── The dictionary ───────────────────────────────────────────
     Keyed on the exact English string, whitespace-collapsed. */
  /* The dictionaries live one per language in assets/i18n/<code>.js and
     are fetched only when that language is picked: together they are
     over a megabyte, and an English visitor needs none of it. */
  var STRINGS = global.SitehouseI18nStrings = global.SitehouseI18nStrings || {};

  /* ── State ────────────────────────────────────────────────── */
  function stored(key, fallback) {
    try { return global.localStorage.getItem(key) || fallback; }
    catch (e) { return fallback; }
  }

  /* A page built for one language (assets under /de/, /sq/ …) says so on
     <html>. That is the language, whatever a previous visit preferred: the
     URL is what the visitor and the search engine both see. The preference
     is still kept, so links from an app page follow it. */
  var BUILT_LANG = doc.documentElement.getAttribute('data-built-lang') || '';
  var ROUTES = global.XovahRoutes || null;

  var lang = BUILT_LANG || stored(LKEY, 'en');
  var currency = stored(CKEY, 'EUR');
  if (!LANGS.some(function (l) { return l.code === lang; })) lang = 'en';
  if (!CURRENCIES.some(function (c) { return c.code === currency; })) currency = 'EUR';

  function langInfo() {
    return LANGS.filter(function (l) { return l.code === lang; })[0] || LANGS[0];
  }
  function curInfo() {
    return CURRENCIES.filter(function (c) { return c.code === currency; })[0] || CURRENCIES[0];
  }

  /* ── Money ────────────────────────────────────────────────── */
  function format(eur) {
    var c = curInfo();
    var value = eur * c.rate;
    /* Money keeps its minor unit. Dropping it on round numbers put
       '€900' next to '€79.99' in the same price list, and printed
       invoice totals without cents. Currencies that genuinely have no
       minor unit — yen, won — still get none. */
    var digits = c.whole ? 0 : 2;
    try {
      return new Intl.NumberFormat(langInfo().locale, {
        style: 'currency', currency: c.code,
        minimumFractionDigits: digits, maximumFractionDigits: digits
      }).format(value);
    } catch (e) {
      return c.code + ' ' + value.toFixed(digits);
    }
  }

  function paintPrices(root) {
    var nodes = (root || doc).querySelectorAll('.cur[data-eur]');
    [].forEach.call(nodes, function (el) {
      var eur = parseFloat(el.getAttribute('data-eur'));
      if (isNaN(eur)) return;
      el.textContent = format(eur);
    });
  }

  /* ── Words ────────────────────────────────────────────────── */
  /* The original English of every text node, captured once. Switching
     language always translates from English, never from whatever the
     previous language left behind. */
  var originals = [];
  var seen = new WeakSet();

  function collapse(t) { return t.replace(/\s+/g, ' ').trim(); }

  /* Re-runnable. The footer, the mobile drawer and the dashboard's views
     are all built after this file loads, so capture has to be able to
     pick up nodes that did not exist the first time. Nodes already
     captured keep the English they were first seen with. */
  function capture() {
    var walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        if (p.classList && p.classList.contains('cur')) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        return collapse(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walk.nextNode())) {
      if (seen.has(n)) continue;
      seen.add(n);
      originals.push({ node: n, text: n.nodeValue });
    }
    // Nodes that have since left the document are dead weight on every pass.
    originals = originals.filter(function (o) { return o.node.isConnected; });
  }

  var ATTRS = ['placeholder', 'aria-label', 'title'];
  var attrOriginals = [];
  var attrSeen = new WeakSet();

  function captureAttrs() {
    ATTRS.forEach(function (a) {
      [].forEach.call(doc.querySelectorAll('[' + a + ']'), function (el) {
        var mark = a + '|' + el.getAttribute(a);
        if (el.__i18nAttrs && el.__i18nAttrs[a] !== undefined) return;
        el.__i18nAttrs = el.__i18nAttrs || {};
        el.__i18nAttrs[a] = el.getAttribute(a);
        attrOriginals.push({ el: el, attr: a, text: el.getAttribute(a) });
      });
    });
    attrOriginals = attrOriginals.filter(function (o) { return o.el.isConnected; });
  }

  /* Fetch a language's dictionary once, then call back. */
  var loading = {};
  function ensure(code, done) {
    if (code === 'en' || STRINGS[code]) return done();
    if (!loading[code]) {
      loading[code] = [];
      var s = doc.createElement('script');
      s.src = DICT_BASE + code + '.js?v=' + DICT_V;
      s.onload = s.onerror = function () {
        var q = loading[code]; loading[code] = null;
        q.forEach(function (fn) { fn(); });
      };
      doc.head.appendChild(s);
    }
    if (loading[code]) loading[code].push(done); else done();
  }

  function paintWords() {
    /* English is what the markup already says. Until another language has
       been shown there is nothing to restore, so skip walking the page. */
    if (lang === 'en' && !originals.length) {
      doc.documentElement.setAttribute('lang', lang);
      return;
    }
    capture();
    captureAttrs();
    var dict = STRINGS[lang] || null;

    originals.forEach(function (o) {
      if (!dict) { o.node.nodeValue = o.text; return; }
      var key = collapse(o.text);
      var hit = dict[key];
      if (!hit) { o.node.nodeValue = o.text; return; }
      // Keep the surrounding whitespace the markup had.
      var lead = o.text.match(/^\s*/)[0];
      var tail = o.text.match(/\s*$/)[0];
      o.node.nodeValue = lead + hit + tail;
    });

    attrOriginals.forEach(function (o) {
      var hit = dict && dict[collapse(o.text)];
      o.el.setAttribute(o.attr, hit || o.text);
    });

    doc.documentElement.setAttribute('lang', lang);
  }

  /* ── Apply ────────────────────────────────────────────────── */
  var listeners = [];

  function apply() {
    paintWords();
    paintPrices();
    localizeLinks();
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    /* An event as well as the callback list, because script order is not
       guaranteed: anything loaded before this file cannot have called
       onChange yet, but it can already be listening. */
    try { doc.dispatchEvent(new CustomEvent('xovah:i18n', { detail: { lang: lang, currency: currency } })); }
    catch (e) { /* very old browser — the callback list still fired */ }
    [].forEach.call(doc.querySelectorAll('[data-i18n-lang]'), function (s) { s.value = lang; });
    [].forEach.call(doc.querySelectorAll('[data-i18n-cur]'), function (s) { s.value = currency; });
  }

  function setLang(code) {
    try { global.localStorage.setItem(LKEY, code); } catch (e) {}
    /* On a built page the translation lives at another URL, so switching
       language means going there — to the same page, not to the home page. */
    if (BUILT_LANG) {
      var alt = doc.querySelector('link[rel="alternate"][hreflang="' + code + '"]');
      /* The path, not the whole URL: the alternates are written with the
         production domain, and a preview or a local run must stay put. */
      var to = '/' + code;
      if (alt) {
        try { to = new global.URL(alt.getAttribute('href'), global.location.href).pathname; }
        catch (e) { to = alt.getAttribute('href'); }
      }
      global.location.href = to;
      return;
    }
    lang = code;
    ensure(code, function () { if (lang === code) apply(); });
  }

  /* ── Links written by scripts ──────────────────────────────────
     Several files build their own markup with the English filenames
     ('pricing.html'). Inside /de/ that would resolve to a page that does
     not exist, so every link is pointed at this language's own URL as it
     appears — including the ones added after this file has run. */
  function localizeLinks(root) {
    if (!ROUTES) return;
    var links = (root || doc).querySelectorAll ? (root || doc).querySelectorAll('a[href]') : [];
    [].forEach.call(links, function (a) {
      var href = a.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#|\/\/|\/)/.test(href)) return;
      var rest = href.replace(/^\.\//, '');
      var cut = rest.search(/[?#]/);
      var name = (cut === -1 ? rest : rest.slice(0, cut)).replace(/\.html$/, '') || 'index';
      var tail = cut === -1 ? '' : rest.slice(cut);
      var key = null;
      for (var k in ROUTES.names) if (ROUTES.names[k] === name) key = k;
      if (key && ROUTES.routes[key]) {
        a.setAttribute('href', (ROUTES.routes[key][ROUTES.lang] || ROUTES.routes[key].en) + tail);
      } else if (ROUTES.app.indexOf(name) !== -1) {
        a.setAttribute('href', '/' + name + tail);
      }
    });
  }

  function setCurrency(code) {
    currency = code;
    try { global.localStorage.setItem(CKEY, code); } catch (e) {}
    apply();
  }

  /* ── The control ──────────────────────────────────────────── */
  function control(compact) {
    var wrap = doc.createElement('div');
    wrap.className = 'i18n' + (compact ? ' i18n--compact' : '');
    wrap.setAttribute('data-no-i18n', '');

    function field(labelText, name, items, value, onPick) {
      var f = doc.createElement('label');
      f.className = 'i18n-field';
      var span = doc.createElement('span');
      span.textContent = labelText;
      var sel = doc.createElement('select');
      sel.setAttribute(name, '');
      items.forEach(function (i) {
        var o = doc.createElement('option');
        o.value = i.code;
        o.textContent = i.text;
        sel.appendChild(o);
      });
      sel.value = value;
      sel.addEventListener('change', function () { onPick(sel.value); });
      f.appendChild(span);
      f.appendChild(sel);
      return f;
    }

    wrap.appendChild(field('Language', 'data-i18n-lang',
      LANGS.map(function (l) { return { code: l.code, text: l.label }; }),
      lang, setLang));

    wrap.appendChild(field('Currency', 'data-i18n-cur',
      CURRENCIES.map(function (c) { return { code: c.code, text: c.code + ' · ' + c.label }; }),
      currency, setCurrency));

    var note = doc.createElement('p');
    note.className = 'i18n-note';
    note.textContent = 'Prices are shown for guidance. Billing is in EUR.';
    wrap.appendChild(note);

    return wrap;
  }

  function mount() {
    /* The landing page's own menu. */
    var slot = doc.querySelector('[data-theme-slot]');
    if (slot && !slot.parentNode.querySelector('.i18n')) {
      slot.parentNode.insertBefore(control(true), slot.nextSibling);
    }
    /* The drawer every other public page builds. */
    var drawer = doc.querySelector('.m-drawer-body');
    if (drawer && !drawer.querySelector('.i18n')) drawer.appendChild(control(true));
    /* Account settings in the dashboard. */
    var settings = doc.querySelector('[data-i18n-slot]');
    if (settings && !settings.querySelector('.i18n')) settings.appendChild(control(false));
  }

  global.SitehouseI18n = {
    format: format,
    paintPrices: paintPrices,
    onChange: function (fn) { listeners.push(fn); },
    get lang() { return lang; },
    get currency() { return currency; },
    setLang: setLang,
    setCurrency: setCurrency,
    mount: mount
  };

  function start() {
    apply();
    mount();
    if (lang !== 'en') ensure(lang, apply);
    /* The footer, the drawer and the dashboard's settings card are built
       by other files that may run after this one, so sweep again once
       they have had their turn. */
    global.setTimeout(function () { apply(); mount(); }, 0);
    global.setTimeout(function () { apply(); mount(); }, 400);
    if (ROUTES && global.MutationObserver) {
      var pending = 0;
      new global.MutationObserver(function () {
        if (pending) return;
        pending = global.setTimeout(function () { pending = 0; localizeLinks(); }, 60);
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
