/* ───────────────────────────────────────────────────────────────
   Xovah — cookie consent
   Self-contained: injects its own styles so it works on the landing
   page (inline CSS) and the app pages (xovah.css) alike.

   Behaviour: nothing beyond the strictly necessary consent cookie is
   set until the visitor chooses. "Essential only" is exactly as easy
   to click as "Accept all" — no dark patterns, no pre-ticked boxes.

   TODO before launch: if analytics are ever added, load them inside
   enableOptional() and nowhere else, so a rejected banner really does
   mean nothing extra is set.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var COOKIE = 'xovah_consent';
  var MAX_AGE = 60 * 60 * 24 * 180;          // 180 days, then ask again
  var doc = global.document;

  function readCookie(name) {
    return doc.cookie.split('; ').reduce(function (found, pair) {
      var bits = pair.split('=');
      return bits[0] === name ? decodeURIComponent(bits.slice(1).join('=')) : found;
    }, '');
  }

  function writeCookie(name, value) {
    var secure = global.location.protocol === 'https:' ? '; Secure' : '';
    doc.cookie = name + '=' + encodeURIComponent(value) +
      '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' + secure;
  }

  function clearCookie(name) {
    doc.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
  }

  function choice() { return readCookie(COOKIE); }

  // Hook for anything that may only run with full consent.
  function enableOptional() {
    // Nothing optional is loaded in this build — no analytics, no ads,
    // no third-party embeds. Wire them in here when they exist.
  }

  var STYLES = '' +
    '.ck-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgb(var(--c-paper));' +
      'border-top:1px solid rgb(var(--c-line));box-shadow:0 -1px 0 rgb(var(--c-shadow) / 0.04)}' +
    '.ck-in{max-width:76rem;margin:0 auto;padding:1.1rem 1.5rem;display:flex;gap:1.5rem;' +
      'align-items:flex-start;justify-content:space-between;flex-wrap:wrap}' +
    '.ck-copy{max-width:38rem;min-width:16rem;flex:1 1 20rem}' +
    '.ck-eyebrow{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.6875rem;' +
      'letter-spacing:0.16em;text-transform:uppercase;color:rgb(var(--c-ink-soft))}' +
    '.ck-title{font-family:Inter,"Helvetica Neue",Arial,sans-serif;font-weight:600;' +
      'letter-spacing:-0.022em;font-size:1rem;color:rgb(var(--c-ink));margin-top:0.45rem}' +
    '.ck-text{font-size:0.8125rem;line-height:1.55;color:rgb(var(--c-ink-mid));margin-top:0.4rem}' +
    '.ck-text a{color:rgb(var(--c-accent));font-weight:600;text-decoration:underline;text-underline-offset:2px}' +
    '.ck-actions{display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center}' +
    '.ck-btn{font-family:inherit;font-size:0.8125rem;font-weight:600;border-radius:0.375rem;' +
      'padding:0.65rem 1.15rem;cursor:pointer;border:1px solid transparent;white-space:nowrap;' +
      'transition:background-color 180ms ease,border-color 180ms ease,color 180ms ease}' +
    '.ck-accept{background:rgb(var(--c-accent));color:#FFFFFF}' +
    '.ck-accept:hover{background:rgb(var(--c-accent-hi))}' +
    '.ck-reject{background:rgb(var(--c-surface));color:rgb(var(--c-accent-text));border-color:rgb(var(--c-line-firm))}' +
    '.ck-reject:hover{border-color:rgb(var(--c-accent))}' +
    '.ck-btn:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:3px}' +
    '.ck-note{font-size:0.75rem;color:rgb(var(--c-ink-soft));margin-top:0.5rem}' +
    '@media (max-width:640px){.ck-in{padding:1rem 1.25rem;gap:1rem}.ck-btn{flex:1 1 auto}}' +
    '@media (prefers-reduced-motion: reduce){.ck-btn{transition:none}}';

  function injectStyles() {
    if (doc.getElementById('ck-styles')) return;
    var el = doc.createElement('style');
    el.id = 'ck-styles';
    el.textContent = STYLES;
    doc.head.appendChild(el);
  }

  function policyHref() {
    // Every page sits at the site root, so a flat link is right.
    return 'cookies.html';
  }

  function remove() {
    var bar = doc.getElementById('ck-bar');
    if (bar) bar.parentNode.removeChild(bar);
  }

  function show() {
    injectStyles();
    remove();

    var bar = doc.createElement('div');
    bar.className = 'ck-bar';
    bar.id = 'ck-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie choices');
    bar.innerHTML =
      '<div class="ck-in">' +
        '<div class="ck-copy">' +
          '<p class="ck-eyebrow">Cookies</p>' +
          '<p class="ck-title">We only set what you agree to.</p>' +
          '<p class="ck-text">Xovah needs a couple of strictly necessary cookies to keep you ' +
            'signed in and to remember this choice. Anything beyond that is optional and stays ' +
            'off until you say otherwise. Read the ' +
            '<a href="' + policyHref() + '">cookie policy</a>.</p>' +
        '</div>' +
        '<div class="ck-actions">' +
          '<button class="ck-btn ck-reject" data-ck="essential" type="button">Essential only</button>' +
          '<button class="ck-btn ck-accept" data-ck="all" type="button">Accept all cookies</button>' +
        '</div>' +
      '</div>';

    doc.body.appendChild(bar);
    var first = bar.querySelector('.ck-btn');
    if (first) first.focus();
  }

  function decide(value) {
    writeCookie(COOKIE, value);
    if (value === 'all') enableOptional();
    remove();
  }

  function withdraw() {
    clearCookie(COOKIE);
    show();
  }

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ck]');
    if (btn) { decide(btn.getAttribute('data-ck')); return; }

    // Footer "Cookie settings" links reopen the banner.
    var reopen = e.target.closest('[data-cookie-settings]');
    if (reopen) { e.preventDefault(); withdraw(); }
  });

  function start() {
    var made = choice();
    if (made === 'all') { enableOptional(); return; }
    if (made === 'essential') return;
    show();
  }

  global.SitehouseCookies = { choice: choice, open: withdraw, decide: decide };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
