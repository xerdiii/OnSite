/* ───────────────────────────────────────────────────────────────
   Xovah — motion for the device in the home page extras section
   (markup in index.html #extras, styles in assets/devices.css)

   - the device drifts a few pixels and tilts a fraction of a degree as
     the section scrolls past, eased so it never tracks the wheel exactly
   - the form cards come in one after another the first time it is seen
   - the answers fill in one at a time, and a click on any option moves
     the selection there; the progress bar follows

   With reduced motion none of this runs and the form shows filled in.
   ─────────────────────────────────────────────────────────────── */
(function () {
  var dv = document.querySelector('#extras .dv');
  if (!dv) return;

  var forms = dv.querySelectorAll('.rq');

  function fill(form) {
    var groups = form.querySelectorAll('.rq-opts');
    var done = form.querySelectorAll('.rq-opt.is-on').length;
    var bar = form.querySelector('.rq-bar i');
    // step 1 of 2: four answers take the bar to half way
    if (bar) bar.style.setProperty('--rq-fill', (12 + (done / groups.length) * 38) + '%');
  }

  function pick(opt) {
    var group = opt.parentNode;
    var current = group.querySelector('.is-on');
    if (current === opt) return;
    if (current) current.classList.remove('is-on');
    opt.classList.add('is-on');
    opt.classList.add('is-tap');
    setTimeout(function () { opt.classList.remove('is-tap'); }, 220);
    fill(group.closest('.rq'));
  }

  dv.addEventListener('click', function (e) {
    var opt = e.target.closest && e.target.closest('.rq-opt');
    if (opt) pick(opt);
  });

  Array.prototype.forEach.call(forms, fill);

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  /* ── Entrance, then the answers fill in one by one ── */
  var answers = [];
  Array.prototype.forEach.call(forms, function (form) {
    var chosen = [];
    Array.prototype.forEach.call(form.querySelectorAll('.rq-opts'), function (group, i) {
      var on = group.querySelector('.is-on');
      // the first answer is already given; the rest are chosen as it plays
      if (on && i > 0) { on.classList.remove('is-on'); chosen.push(on); }
    });
    answers.push(chosen);
    fill(form);
  });

  dv.classList.add('is-armed');

  var shown = false;
  function reveal() {
    if (shown) return;
    shown = true;
    io.disconnect();
    dv.classList.add('is-in');
    setTimeout(function () { dv.classList.add('is-settled'); }, 1700);
    answers.forEach(function (chosen) {
      chosen.forEach(function (opt, i) {
        setTimeout(function () {
          // a visitor may already have picked something in this group
          if (!opt.parentNode.querySelector('.is-on')) pick(opt);
        }, 1900 + i * 750);
      });
    });
    setTimeout(function () { dv.classList.add('is-done'); }, 1900 + 3 * 750);
  }
  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) reveal();
  }, { threshold: 0.25 });
  io.observe(dv);

  /* ── Scroll drift ── */
  var y = 0, r = 0, ty = 0, tr = 0, raf = 0;

  function target() {
    var box = dv.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    // -1 when the device is a screen below centre, +1 a screen above
    var t = ((vh / 2) - (box.top + box.height / 2)) / vh;
    t = Math.max(-1, Math.min(1, t));
    // belt and braces for the observer: in view is in view
    if (!shown && box.top < vh * 0.8 && box.bottom > 0) reveal();
    ty = t * -26;
    tr = t * 0.9;
  }

  function frame() {
    y += (ty - y) * 0.08;
    r += (tr - r) * 0.08;
    dv.style.setProperty('--dv-y', y.toFixed(2) + 'px');
    dv.style.setProperty('--dv-r', r.toFixed(3) + 'deg');
    raf = (Math.abs(ty - y) > 0.05 || Math.abs(tr - r) > 0.001) ? requestAnimationFrame(frame) : 0;
  }

  function onScroll() {
    target();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  target(); y = ty; r = tr;
  frame();
})();
