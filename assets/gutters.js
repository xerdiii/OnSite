/* ───────────────────────────────────────────────────────────────
   Xovah — the gutters

   On a wide screen the shell leaves a column of empty space either
   side. This puts something there that earns its place: the section
   index on the right, marking where you are and taking you anywhere,
   and the wordmark with a scroll line on the left.

   It is built from the page itself — each section's eyebrow is its
   label — so a new section appears in the index with no work, in
   whatever language the page is served in.

   Nothing is fetched, nothing animates on its own, and none of it
   exists below 1280px, where there is no gutter to live in.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var MIN_W = 1280;

  function init() {
    if (doc.body.hasAttribute('data-app')) return;
    if (doc.querySelector('[data-gutters]')) return;

    var main = doc.querySelector('main');
    if (!main) return;

    /* One entry per section that names itself. A section with no eyebrow
       is a continuation of the one above it, not a place of its own. */
    var items = [];
    [].forEach.call(main.querySelectorAll('section'), function (section) {
      var label = section.querySelector('.eyebrow, .closer-eyebrow, .mono-label');
      if (!label) return;
      /* A section that is not on the page is not a place you can be:
         the ratings section, for one, stays hidden until there are
         ratings to show, and indexing it pointed at nothing. */
      if (section.hidden || !section.offsetHeight) return;
      var text = label.textContent.trim();
      if (!text || text.length > 26) return;
      if (!section.id) section.id = 'sec-' + (items.length + 1);
      items.push({ id: section.id, text: text, el: section });
    });
    if (items.length < 3) return;

    var wrap = doc.createElement('div');
    wrap.className = 'gut';
    wrap.setAttribute('data-gutters', '');

    var left = doc.createElement('div');
    left.className = 'gut-left';
    left.setAttribute('aria-hidden', 'true');
    left.innerHTML =
      '<span class="gut-mark">XOVAHWEB</span>' +
      '<span class="gut-line"><i data-gut-progress></i></span>';

    var nav = doc.createElement('nav');
    nav.className = 'gut-right';
    nav.setAttribute('aria-label', 'Sections');
    nav.innerHTML = items.map(function (it, i) {
      return '<a class="gut-item" href="#' + it.id + '" data-gut-link="' + it.id + '">' +
        '<span class="gut-n">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="gut-t">' + it.text + '</span></a>';
    }).join('');

    wrap.appendChild(left);
    wrap.appendChild(nav);
    doc.body.appendChild(wrap);

    var links = {};
    [].forEach.call(nav.querySelectorAll('[data-gut-link]'), function (a) {
      links[a.getAttribute('data-gut-link')] = a;
    });
    var bar = left.querySelector('[data-gut-progress]');

    /* The section the reader is actually in: the last one whose top has
       passed the upper third of the screen. */
    var current = null;
    function mark() {
      var line = global.innerHeight * 0.34;
      var found = items[0];
      for (var i = 0; i < items.length; i++) {
        if (!items[i].el.offsetHeight) continue;
        if (items[i].el.getBoundingClientRect().top <= line) found = items[i];
      }
      if (found && found.id !== current) {
        if (current && links[current]) links[current].classList.remove('is-on');
        current = found.id;
        if (links[current]) links[current].classList.add('is-on');
      }
      var doch = doc.documentElement.scrollHeight - global.innerHeight;
      var p = doch > 0 ? Math.min(1, Math.max(0, global.scrollY / doch)) : 0;
      bar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    }

    var ticking = 0;
    function onScroll() {
      if (ticking) return;
      ticking = global.requestAnimationFrame(function () { ticking = 0; mark(); });
    }

    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', onScroll);
    mark();
  }

  /* Only built where there is room for it. Built once: a narrow window
     that is widened later gets it on the next load, which is cheaper
     than keeping two layouts alive. */
  function start() {
    if (global.innerWidth >= MIN_W) init();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
