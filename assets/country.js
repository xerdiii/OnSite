/* ───────────────────────────────────────────────────────────────
   Onsite — country dialling picker
   A quarter-width control that shows the dialling code, opens a
   searchable list, and writes the code back. The search matches on
   the country name, the dialling code and the ISO letters, so
   "germany", "+49" and "de" all land on the same row.
   Without JS the button is inert and the phone field still takes a
   number typed in full — which is all a plain tel input ever was.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var DATA = [
    ["AL","Albania","+355"],["DZ","Algeria","+213"],["AD","Andorra","+376"],
    ["AR","Argentina","+54"],["AM","Armenia","+374"],["AU","Australia","+61"],
    ["AT","Austria","+43"],["AZ","Azerbaijan","+994"],["BH","Bahrain","+973"],
    ["BD","Bangladesh","+880"],["BY","Belarus","+375"],["BE","Belgium","+32"],
    ["BA","Bosnia and Herzegovina","+387"],["BR","Brazil","+55"],["BG","Bulgaria","+359"],
    ["KH","Cambodia","+855"],["CM","Cameroon","+237"],["CA","Canada","+1"],
    ["CL","Chile","+56"],["CN","China","+86"],["CO","Colombia","+57"],
    ["CR","Costa Rica","+506"],["HR","Croatia","+385"],["CY","Cyprus","+357"],
    ["CZ","Czechia","+420"],["DK","Denmark","+45"],["DO","Dominican Republic","+1"],
    ["EC","Ecuador","+593"],["EG","Egypt","+20"],["EE","Estonia","+372"],
    ["ET","Ethiopia","+251"],["FI","Finland","+358"],["FR","France","+33"],
    ["GE","Georgia","+995"],["DE","Germany","+49"],["GH","Ghana","+233"],
    ["GI","Gibraltar","+350"],["GR","Greece","+30"],["GT","Guatemala","+502"],
    ["HK","Hong Kong","+852"],["HU","Hungary","+36"],["IS","Iceland","+354"],
    ["IN","India","+91"],["ID","Indonesia","+62"],["IQ","Iraq","+964"],
    ["IE","Ireland","+353"],["IL","Israel","+972"],["IT","Italy","+39"],
    ["JM","Jamaica","+1"],["JP","Japan","+81"],["JO","Jordan","+962"],
    ["KZ","Kazakhstan","+7"],["KE","Kenya","+254"],["XK","Kosovo","+383"],
    ["KW","Kuwait","+965"],["LV","Latvia","+371"],["LB","Lebanon","+961"],
    ["LY","Libya","+218"],["LI","Liechtenstein","+423"],["LT","Lithuania","+370"],
    ["LU","Luxembourg","+352"],["MY","Malaysia","+60"],["MT","Malta","+356"],
    ["MX","Mexico","+52"],["MD","Moldova","+373"],["MC","Monaco","+377"],
    ["ME","Montenegro","+382"],["MA","Morocco","+212"],["NL","Netherlands","+31"],
    ["NZ","New Zealand","+64"],["NG","Nigeria","+234"],["MK","North Macedonia","+389"],
    ["NO","Norway","+47"],["OM","Oman","+968"],["PK","Pakistan","+92"],
    ["PS","Palestine","+970"],["PA","Panama","+507"],["PY","Paraguay","+595"],
    ["PE","Peru","+51"],["PH","Philippines","+63"],["PL","Poland","+48"],
    ["PT","Portugal","+351"],["QA","Qatar","+974"],["RO","Romania","+40"],
    ["RU","Russia","+7"],["SA","Saudi Arabia","+966"],["RS","Serbia","+381"],
    ["SG","Singapore","+65"],["SK","Slovakia","+421"],["SI","Slovenia","+386"],
    ["ZA","South Africa","+27"],["KR","South Korea","+82"],["ES","Spain","+34"],
    ["LK","Sri Lanka","+94"],["SE","Sweden","+46"],["CH","Switzerland","+41"],
    ["TW","Taiwan","+886"],["TZ","Tanzania","+255"],["TH","Thailand","+66"],
    ["TN","Tunisia","+216"],["TR","Turkiye","+90"],["UA","Ukraine","+380"],
    ["AE","United Arab Emirates","+971"],["GB","United Kingdom","+44"],
    ["US","United States","+1"],["UY","Uruguay","+598"],["UZ","Uzbekistan","+998"],
    ["VE","Venezuela","+58"],["VN","Vietnam","+84"]
  ];

  var btn = document.getElementById('ccBtn');
  if (!btn) return;

  var field  = document.getElementById('ccField');
  var pop    = document.getElementById('ccPop');
  var list   = document.getElementById('ccList');
  var search = document.getElementById('ccSearch');
  var empty  = document.getElementById('ccEmpty');
  var flagEl = document.getElementById('ccFlag');
  var dialEl = document.getElementById('ccDial');
  var phone  = document.getElementById('phone');
  var wrap   = field.parentNode;   // the pair — the popover hangs off this

  // Regional-indicator pair, built from the ISO code. Cheaper than
  // shipping a hundred emoji in the source.
  function flag(iso) {
    return String.fromCodePoint(
      0x1F1E6 + iso.charCodeAt(0) - 65,
      0x1F1E6 + iso.charCodeAt(1) - 65
    );
  }

  var rows = DATA.map(function (c) {
    return {
      iso: c[0], name: c[1], dial: c[2], flag: flag(c[0]),
      hay: (c[1] + ' ' + c[2] + ' ' + c[0]).toLowerCase()
    };
  });

  var current = null;
  var shown = rows;
  var active = -1;

  function select(row) {
    if (!row) return;
    current = row;
    flagEl.textContent = row.flag;
    dialEl.textContent = row.dial;
    btn.setAttribute('aria-label', 'Country dialling code, ' + row.name + ' ' + row.dial);
    field.setAttribute('data-iso', row.iso);
    field.setAttribute('data-dial', row.dial);
  }

  function esc(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(q) {
    q = (q || '').trim().toLowerCase();
    shown = q ? rows.filter(function (r) { return r.hay.indexOf(q) > -1; }) : rows;
    // A prefix match is what you meant. A substring match is a consolation.
    if (q) {
      shown = shown.slice().sort(function (a, b) {
        return (b.hay.indexOf(q) === 0) - (a.hay.indexOf(q) === 0);
      });
    }
    list.innerHTML = shown.map(function (r, i) {
      return '<li role="option" data-i="' + i + '"' +
             (current && current.iso === r.iso ? ' aria-selected="true"' : '') + '>' +
             '<span class="cc-o-flag" aria-hidden="true">' + r.flag + '</span>' +
             '<span class="cc-o-name">' + esc(r.name) + '</span>' +
             '<span class="cc-o-dial">' + r.dial + '</span></li>';
    }).join('');
    empty.hidden = shown.length > 0;
    active = shown.length ? 0 : -1;
    mark();
  }

  function mark() {
    var items = list.children, i;
    for (i = 0; i < items.length; i++) {
      items[i].className = (i === active) ? 'is-active' : '';
    }
    var el = items[active];
    if (!el) return;
    var top = el.offsetTop, bot = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bot > list.scrollTop + list.clientHeight) list.scrollTop = bot - list.clientHeight;
  }

  function open() {
    search.value = '';
    render('');
    pop.hidden = false;
    field.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    // Focusing the search box raises the keyboard, and on a phone the
    // keyboard covers the list you just opened. Pointer screens only.
    if (window.matchMedia('(min-width:700px)').matches) search.focus();
    document.addEventListener('mousedown', away, true);
  }

  function close(refocus) {
    pop.hidden = true;
    field.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', away, true);
    if (refocus) btn.focus();
  }

  function away(e) { if (!wrap.contains(e.target)) close(false); }

  btn.addEventListener('click', function () {
    if (pop.hidden) { open(); } else { close(true); }
  });

  search.addEventListener('input', function () { render(search.value); });

  list.addEventListener('click', function (e) {
    var li = e.target;
    while (li && li !== list && li.tagName !== 'LI') { li = li.parentNode; }
    if (!li || li === list) return;
    select(shown[+li.getAttribute('data-i')]);
    close(true);
    if (phone) phone.focus();
  });

  pop.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!shown.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      mark();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active > -1) { select(shown[active]); close(true); if (phone) phone.focus(); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
  });

  // Kosovo to start with, corrected from the browser locale when that
  // says otherwise — a guess the visitor overrules in one tap.
  select(rows.filter(function (r) { return r.iso === 'XK'; })[0] || rows[0]);
  try {
    var region = (navigator.language || '').split('-')[1];
    if (region) {
      var hit = rows.filter(function (r) { return r.iso === region.toUpperCase(); })[0];
      if (hit) select(hit);
    }
  } catch (err) { /* the locale is a nicety, never a requirement */ }

  render('');
})();
