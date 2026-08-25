/* ───────────────────────────────────────────────────────────────
   Sitehouse — client dashboard
   Hash-routed sections rendered into #view. All state is the mock
   store in demo.js; no network calls, no real payments.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var O = window.Sitehouse;
  // Gated below, once Supabase has restored the session.

  var view = document.getElementById('view');
  var esc = O.esc;

  // ── Small helpers ────────────────────────────────────────────
  function money(c) { return O.euro(c); }

  function head(eyebrow, title, sub) {
    return '<p class="eyebrow text-ink-soft">' + esc(eyebrow) + '</p>' +
           '<h1 class="h-display doc-title mt-3">' + esc(title) + '</h1>' +
           (sub ? '<p class="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-mid">' + esc(sub) + '</p>' : '');
  }

  function statusTag(state) {
    var map = {
      paid:      ['tag-ok',   'Paid'],
      pending:   ['tag-wait', 'Pending'],
      due:       ['tag-due',  'Due'],
      active:    ['tag-ok',   'Active'],
      inactive:  ['tag-off',  'Not active'],
      soon:      ['tag-soon', 'Coming soon'],
      completed: ['tag-ok',   'Completed'],
      'in-progress': ['tag-due', 'In progress'],
      answered:  ['tag-ok',   'Answered'],
      open:      ['tag-due',  'Open']
    };
    var m = map[state] || ['tag-wait', state];
    return '<span class="tag ' + m[0] + '">' + esc(m[1]) + '</span>';
  }

  function tracker() {
    return '<ul class="track">' + O.stages().map(function (s) {
      var dot = s.state === 'done' ? '<span class="dot dot-done">✓</span>'
              : s.state === 'active' ? '<span class="dot dot-active"></span>'
              : '<span class="dot dot-wait"></span>';
      var tone = s.state === 'wait' ? 'text-ink-soft' : 'text-ink';
      return '<li>' + dot +
        '<span class="min-w-0 flex-1"><span class="block text-sm font-semibold ' + tone + '">' + esc(s.label) + '</span>' +
        '<span class="block text-[0.8125rem] text-ink-soft">' + esc(s.note) + '</span></span></li>';
    }).join('') + '</ul>';
  }

  // ── Sections ─────────────────────────────────────────────────
  var routes = {};

  var A = function () { return window.SitehouseApp; };

  // The preview frame. Not a screenshot — an iframe of preview.html,
  // which renders from the same store this dashboard writes to, so it
  // can never drift from what the customer actually told us.
  function previewCard(s) {
    var url = (s.project && s.project.previewUrl) || 'preview.sitehouse.eu';
    var live = s.project && s.project.stage === 'live';
    return '' +
    '<div class="prev">' +
      '<div class="prev-chrome">' +
        '<span class="prev-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="prev-url">' + esc(live ? (s.customer.websiteUrl || url) : url) + '</span>' +
        '<span class="prev-tabs">' +
          '<button type="button" class="prev-tab is-on" data-prev-view="desktop" aria-label="Desktop view">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M9 20h6"/></svg></button>' +
          '<button type="button" class="prev-tab" data-prev-view="phone" aria-label="Phone view">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg></button>' +
        '</span>' +
      '</div>' +
      '<div class="prev-stage" data-view="desktop">' +
        '<iframe class="prev-frame" src="preview.html" title="Preview of your website" loading="lazy"></iframe>' +
      '</div>' +
      '<div class="prev-foot">' +
        '<a class="btn btn-primary" href="preview.html" target="_blank" rel="noopener">Open full size</a>' +
        '<a class="btn btn-ghost" href="#/website">Everything about my site</a>' +
        '<span class="prev-note">Live preview of your own page</span>' +
      '</div>' +
    '</div>';
  }

  function approveCard(s) {
    var bal = O.balance(s.order.oneTimeCents);
    if (s.project.stage === 'review') {
      return '<div class="approve mt-5">' +
        '<p class="approve-h">Your website is ready for you to look at.</p>' +
        '<p class="approve-p">Go through every section. Anything wrong, send it back and we fix it — that ' +
          'costs nothing and there is no limit before approval. Approving is what makes the remaining ' +
          money(bal) + ' due.</p>' +
        '<div class="approve-row">' +
          '<button type="button" class="btn btn-primary" data-act="approve-site">Approve and go live</button>' +
          '<a class="btn btn-ghost" href="#/request">Something needs changing</a>' +
        '</div>' +
      '</div>';
    }
    if (s.project.stage === 'live') {
      return '<div class="approve mt-5" style="border-color:rgb(var(--c-line-firm));background:rgb(var(--c-surface))">' +
        '<p class="approve-h">Your site is live.</p>' +
        '<p class="approve-p">Tell us any time something needs changing. If you are happy with how this went, ' +
          'a rating helps other businesses decide.</p>' +
        '<div class="approve-row">' +
          '<button type="button" class="btn btn-primary" data-rate-open>Rate us</button>' +
          '<a class="btn btn-ghost" href="#/request">Request a change</a>' +
        '</div>' +
      '</div>';
    }
    return '';
  }

  function freeUpsell() {
    return '<div class="upsell mt-6">' +
      '<p class="upsell-h">Want your own name instead?</p>' +
      '<p class="upsell-p">Your page is live on an address we gave you. For ' +
        '<span class="cur" data-eur="10">€10</span> a month we register the domain you want, move the ' +
        'page across, and the old address keeps working. Or step up to a full build and get all 34 ' +
        'sections, your own domain for a year, and the setup work done.</p>' +
      '<div class="approve-row">' +
        '<a class="btn btn-primary" href="#/build">See the builds</a>' +
        '<a class="btn btn-ghost" href="extras.html">Browse the extras</a>' +
      '</div>' +
    '</div>';
  }

  routes['/overview'] = function () {
    var s = O.load(), o = s.order;
    var app = A();
    var free = tier() === 'free';
    var st = app ? app.ratingStats() : { avg: 0, total: 0 };
    var dep = O.deposit(o.oneTimeCents);
    var paidDeposit = s.project.stage !== 'deposit';

    var hoursSet = ((s.freePage && s.freePage.hours) || s.customer.hours || []).length;

    var who = (s.customer.firstName || '').trim();
    return head('Overview', who ? 'Welcome back, ' + esc(who) + '.' : 'Welcome back.',
      (s.customer.business ? esc(s.customer.business) + ' — ' : '') + esc(O.statusLabel()) + '.') +

      '<div class="stats mt-7">' +
        '<div class="stat"><p class="stat-l">Status</p><p class="stat-v">' + esc(O.statusLabel()) +
          '</p><p class="stat-s">' + (s.project.lastUpdate
            ? 'Updated ' + esc(O.date(s.project.lastUpdate)) : 'Nothing to report yet') + '</p></div>' +
        '<div class="stat"><p class="stat-l">Paid so far</p><p class="stat-v">' +
          money(paidDeposit ? dep : 0) + '</p><p class="stat-s">of ' + money(o.oneTimeCents) + ' one-time</p></div>' +
        '<div class="stat"><p class="stat-l">Your pack</p><p class="stat-v">' +
          esc(app ? app.tierName(tier()) : '—') + '</p><p class="stat-s">' +
          (tier() === 'none' ? 'Choose one in Build' : free ? 'Free, hosted by us' : 'Paid once') + '</p></div>' +
        '<div class="stat"><p class="stat-l">Our rating</p><p class="stat-v">' +
          (st.total ? st.avg.toFixed(1) : '—') + '</p><p class="stat-s">' +
          (st.total ? 'from ' + st.total + ' businesses' : 'no ratings yet') + '</p></div>' +
      '</div>' +

      '<div class="mt-7">' + previewCard(s) + '</div>' +
      approveCard(s) +
      (free ? freeUpsell() : '') +

      '<div class="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-2">' +

        '<div class="panel">' +
          '<div class="panel-head"><h2>What happens next</h2></div>' +
          '<div class="panel-body">' +
            '<ul class="ord-steps">' +
              (app ? app.STAGES.map(function (stg, i) {
                var at = app.stageIndex(s.project.stage);
                return '<li class="ord-step ' + (i < at ? 'is-done' : (i === at ? 'is-now' : '')) + '">' +
                  esc(stg.label) + '</li>';
              }).join('') : '') +
            '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-head"><h2>Your details</h2>' +
            '<a href="#/business" class="text-[0.8125rem] font-semibold text-accent">Edit</a></div>' +
          '<div class="panel-body">' +
            '<div class="ord-line"><span>Business</span><b>' + esc(s.customer.business) + '</b></div>' +
            '<div class="ord-line"><span>Phone</span><b>' + esc(s.customer.phone || '—') + '</b></div>' +
            '<div class="ord-line"><span>Opening hours</span><b>' +
              (hoursSet ? hoursSet + ' days set' : 'Not set') + '</b></div>' +
            '<div class="ord-line"><span>Map link</span><b>' +
              ((s.freePage && s.freePage.maps) ? 'Added' : 'Not added') + '</b></div>' +
          '</div>' +
        '</div>' +

      '</div>';
  };

  /* ── Ratings ────────────────────────────────────────────────
     Ours, from customers, collected here rather than pulled from
     Google — so they exist on day one and we own them. */
  routes['/reviews'] = function () {
    var app = A();
    var st = app ? app.ratingStats() : { list: [], total: 0, avg: 0, buckets: [0,0,0,0,0] };
    var mine = st.list.filter(function (r) { return r.mine; })[0];

    var bars = [5, 4, 3, 2, 1].map(function (n) {
      var count = st.buckets[n - 1];
      var pct = st.total ? Math.round(count / st.total * 100) : 0;
      return '<div class="rate-bar"><span>' + n + '</span>' +
        '<i><b style="width:' + pct + '%"></b></i><span>' + count + '</span></div>';
    }).join('');

    var items = st.list.length ? st.list.map(function (r) {
      return '<div class="review-item">' +
        '<div class="review-top">' +
          (app ? app.starsHtml(r.stars, { small: true, readonly: true }) : '') +
          '<span class="review-who">' + esc(r.business || r.who) + '</span>' +
          '<span class="review-when">' + esc(O.date(r.at)) + (r.mine ? ' · yours' : '') + '</span>' +
        '</div>' +
        (r.body ? '<p class="review-body">' + esc(r.body) + '</p>' : '') +
      '</div>';
    }).join('') : '<p class="text-[0.875rem] text-ink-soft">No ratings yet.</p>';

    return head('Ratings', 'What businesses say about us.',
      'Collected here, from customers who actually paid. Not scraped from anywhere and not filtered.') +

      '<div class="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">' +
        '<div class="panel lg:col-span-1">' +
          '<div class="panel-body">' +
            '<div class="rate-avg">' +
              '<span class="rate-avg-n">' + (st.total ? st.avg.toFixed(1) : '—') + '</span>' +
              '<div>' + (app ? app.starsHtml(Math.round(st.avg), { readonly: true }) : '') +
                '<p class="mt-1 text-[0.75rem] text-ink-soft">' + st.total + ' rating' +
                (st.total === 1 ? '' : 's') + '</p></div>' +
            '</div>' +
            '<div class="rate-bars">' + bars + '</div>' +
            '<button type="button" class="btn btn-primary btn-block mt-5" data-rate-open>' +
              (mine ? 'Edit my rating' : 'Rate us') + '</button>' +
            (mine ? '' : '<p class="mt-2 text-center text-[0.75rem] text-ink-soft">Takes about ten seconds.</p>') +
          '</div>' +
        '</div>' +
        '<div class="panel lg:col-span-2">' +
          '<div class="panel-head"><h2>Everything people wrote</h2></div>' +
          '<div class="panel-body">' + items + '</div>' +
        '</div>' +
      '</div>';
  };

  routes['/website'] = function () {
    var s = O.load(), p = s.project, o = s.order;
    var bal = O.balance(o.oneTimeCents);
    var stage = p.stage;

    var action = '';
    if (stage === 'review') {
      action = '<div class="card-ink mt-6 p-6">' +
        '<p class="mono-label text-white/70">Your move</p>' +
        '<h3 class="h-section mt-2 text-xl text-white">Ready for your review</h3>' +
        '<p class="mt-2 text-[0.8125rem] leading-relaxed text-white/80">Look through the preview. When you are happy, approve it — that is what makes the remaining 75% (' + money(bal) + ') due. Nothing is charged automatically.</p>' +
        '<div class="mt-5 flex flex-wrap gap-3">' +
          '<button class="btn btn-light" data-act="approve">Approve website</button>' +
          '<button class="btn btn-ghost" data-act="changes">Something needs changing</button>' +
        '</div></div>';
    } else if (stage === 'final') {
      action = '<div class="card-ink mt-6 p-6">' +
        '<p class="mono-label text-white/70">Final payment</p>' +
        '<h3 class="h-section mt-2 text-xl text-white">Approved — ' + money(bal) + ' now due</h3>' +
        '<p class="mt-2 text-[0.8125rem] leading-relaxed text-white/80">Once this is paid your website goes live and your monthly services begin.</p>' +
        '<button class="btn btn-light mt-5" data-act="pay-final">Pay ' + money(bal) + ' &amp; go live</button></div>';
    } else if (stage === 'live') {
      action = '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Live</p>' +
        '<h3 class="h-section mt-2 text-xl">Your website is live</h3>' +
        '<p class="mt-2 text-[0.8125rem] leading-relaxed text-ink-mid">Paid in full. Monthly services are running — see <a href="#/services" class="font-semibold text-accent underline underline-offset-2">My Services</a>.</p></div>';
    }

    return head('My Website', s.customer.business, null) +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Status</p><p class="h-section mt-2 text-base">' + esc(O.statusLabel()) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Address</p><p class="h-section mt-2 text-base">' + esc(s.customer.websiteUrl) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Delivery date</p><p class="h-section mt-2 text-base">' + esc(O.date(p.deliveryDate)) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Last update</p><p class="h-section mt-2 text-base">' + esc(O.date(p.lastUpdate)) + '</p></div>' +
      '</div>' +

      action +

      '<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<p class="mono-label text-ink-soft">Build progress</p>' +
          '<div class="mt-4">' + tracker() + '</div>' +
        '</div>' +
        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">Preview</p>' +
          '<p class="mt-3 text-[0.8125rem] leading-relaxed text-ink-mid">Your build is staged at <span class="font-semibold text-ink">' + esc(p.previewUrl) + '</span>.</p>' +
          '<button class="btn btn-ghost mt-4" data-act="preview">Open preview</button>' +
          '<p id="preview-note" class="mt-3 hidden text-[0.8125rem] leading-relaxed text-ink-soft">The staging site is simulated in this demo — there is no live preview to open yet.</p>' +
          '<p class="mono-label mt-6 text-ink-soft">Domain &amp; hosting</p>' +
          '<table class="tbl m-cards mt-3"><tbody>' +
            '<tr><td class="name">Domain</td><td>' + esc(s.customer.websiteUrl) + '</td></tr>' +
            '<tr><td class="name">Managed by</td><td>Sitehouse</td></tr>' +
            '<tr><td class="name">Hosting</td><td>' + (p.stage === 'live' ? 'Live — served by Sitehouse' : 'Staged, not yet published') + '</td></tr>' +
            '<tr><td class="name">SSL / HTTPS</td><td>' + (p.stage === 'live' ? 'Active' : 'Issued at launch') + '</td></tr>' +
          '</tbody></table>' +
          '<p class="mono-label mt-6 text-ink-soft">Selected features</p>' +
          '<ul class="mt-3 space-y-1.5 text-[0.8125rem] text-ink-mid">' +
            p.features.map(function (f) { return '<li><span class="arrow">&rarr;</span> ' + esc(f) + '</li>'; }).join('') +
          '</ul>' +
        '</div>' +
      '</div>';
  };

  routes['/payments'] = function () {
    var s = O.load(), o = s.order;
    var dep = O.deposit(o.oneTimeCents), bal = O.balance(o.oneTimeCents);
    var stage = s.project.stage;
    var finalPaid = stage === 'live';
    var monthlyRunning = stage === 'live';

    var rows = s.payments.map(function (p) {
      var st = p.status === 'paid' ? 'paid' : (stage === 'final' ? 'due' : 'pending');
      return '<tr><td class="name">' + esc(p.id) + '</td><td>' + esc(p.description) + '</td>' +
        '<td>' + (p.date ? esc(O.date(p.date)) : '—') + '</td>' +
        '<td class="font-mono">' + money(p.cents) + '</td>' +
        '<td>' + statusTag(st) + '</td>' +
        '<td><button class="btn btn-ghost px-3 py-1 text-[0.75rem]" data-act="invoice" data-id="' + esc(p.id) + '">Receipt</button></td></tr>';
    }).join('');

    return head('Payments', 'One-time and monthly, kept apart.',
      'Your website is a one-time cost split 25/75. Monthly services are separate and only start once you are live.') +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">One-time website total</p><p class="h-section mt-2 text-xl">' + money(o.oneTimeCents) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Paid</p><p class="h-section mt-2 text-xl">' + money(finalPaid ? o.oneTimeCents : dep) + '</p><p class="mt-1 text-[0.8125rem] text-ink-soft">25% deposit' + (finalPaid ? ' + 75% balance' : '') + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Outstanding</p><p class="h-section mt-2 text-xl">' + money(finalPaid ? 0 : bal) + '</p><p class="mt-1 text-[0.8125rem] text-ink-soft">' + (finalPaid ? 'Nothing outstanding' : 'Due after approval') + '</p></div>' +
      '</div>' +

      '<div class="card mt-6 p-6">' +
        '<p class="mono-label text-ink-soft">Website — ' + money(o.oneTimeCents) + ' one-time</p>' +
        '<ul class="timeline mt-4 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          '<li><span class="font-semibold text-ink">25% deposit — ' + money(dep) + '</span><br>Paid ' + esc(O.date('2026-08-04')) + '. This started the project.</li>' +
          '<li' + (finalPaid ? '' : ' class="pending"') + '><span class="font-semibold text-ink">Remaining 75% — ' + money(bal) + '</span><br>' +
            (finalPaid ? 'Paid in full.' : 'Due after you approve the finished website.') + '</li>' +
          '<li' + (monthlyRunning ? '' : ' class="pending"') + '><span class="font-semibold text-ink">Monthly services — ' + money(o.monthlyCents) + ' / month</span><br>' +
            (monthlyRunning ? 'Billing monthly from launch.' : 'Not charged until your website goes live.') + '</li>' +
        '</ul>' +
      '</div>' +

      '<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Monthly services</p>' +
          '<table class="tbl m-cards mt-4"><tbody>' +
            o.monthlyItems.map(function (m) {
              return '<tr><td class="name">' + esc(m.name) + '</td><td class="font-mono">' + money(m.cents) + ' / mo</td><td>' +
                statusTag(monthlyRunning ? 'active' : 'pending') + '</td></tr>';
            }).join('') +
            '<tr><td class="name">Total</td><td class="font-mono">' + money(o.monthlyCents) + ' / mo</td><td></td></tr>' +
          '</tbody></table>' +
          '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">' +
            (monthlyRunning ? 'Next monthly payment: ' + esc(O.date('2026-09-18')) + '.' : 'First monthly payment is taken on the day your website goes live.') +
          '</p>' +
        '</div>' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Invoices &amp; receipts</p>' +
          '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
            '<thead><tr><th>Ref</th><th>Description</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>' +
          '<p id="invoice-note" class="mt-3 hidden text-[0.8125rem] text-ink-soft"></p>' +
        '</div>' +
      '</div>';
  };

  routes['/business'] = function () {
    var c = O.load().customer;
    function f(id, label, val, hint) {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') +
        '<input id="' + id + '" type="text" value="' + esc(val) + '"></div>';
    }

    return head('Business Information', 'What your website says about you.',
      'Edit anything here and send it to us. Nothing publishes automatically — every edit becomes a change request we action.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Contact details</p>' +
          '<div class="mt-5 grid grid-cols-1 gap-5">' +
            f('bi-business', 'Business name', c.business) +
            f('bi-owner', 'Owner name', c.firstName + ' ' + c.lastName) +
            f('bi-email', 'Email', c.email) +
            f('bi-phone', 'Phone', c.phone) +
            f('bi-address', 'Address', c.address) +
            f('bi-url', 'Website address', c.websiteUrl) +
          '</div></div>' +

        '<div class="card p-6"><p class="mono-label text-ink-soft">Profiles &amp; links</p>' +
          '<div class="mt-5 grid grid-cols-1 gap-5">' +
            f('bi-google', 'Google Business profile', c.googleProfile) +
            f('bi-whatsapp', 'WhatsApp number', c.whatsapp) +
            f('bi-instagram', 'Instagram', c.socials.instagram) +
            f('bi-facebook', 'Facebook', c.socials.facebook) +
            f('bi-tiktok', 'TikTok', c.socials.tiktok, 'Leave blank if you do not use it.') +
          '</div></div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Opening hours</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards"><tbody>' +
          c.hours.map(function (h) {
            return '<tr><td class="name">' + esc(h.day) + '</td><td>' + esc(h.open) + '</td></tr>';
          }).join('') +
        '</tbody></table></div>' +
        '<p class="mt-4 text-[0.8125rem] text-ink-soft">To change your hours, send it as a change request — it counts as one of your monthly changes.</p>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Website content</p>' +
        '<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">' +
          [['Services', '9 services listed'], ['Prices', 'Shown against each service'],
           ['Photos', '14 photos in the gallery'], ['Logo', 'Supplied, in use'],
           ['About section', '2 paragraphs'], ['Testimonials', 'Not on the page yet']].map(function (i) {
            return '<div class="card-quiet p-4"><p class="text-sm font-semibold">' + esc(i[0]) + '</p>' +
              '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + esc(i[1]) + '</p></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="mt-6 flex flex-wrap items-center gap-4">' +
        '<button class="btn btn-primary" data-act="submit-business">Send changes to Sitehouse</button>' +
        '<p class="text-[0.8125rem] text-ink-soft">Creates a change request. Nothing goes live until we action it.</p>' +
      '</div>' +
      '<p id="business-done" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>';
  };

  routes['/request'] = function () {
    var s = O.load();
    var active = O.maintenanceActive();
    var left = O.changesLeft();

    if (!active) {
      return head('Request a Change', 'Website Maintenance is not active.',
        'Change requests are part of the Website Maintenance subscription. Without it, changes are quoted individually.') +
        '<div class="card mt-8 p-6">' +
          '<p class="mono-label text-ink-soft">Website Maintenance</p>' +
          '<p class="h-section mt-2 text-2xl">€19.99 <span class="text-base text-ink-soft">/ month</span></p>' +
          '<p class="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-mid">Up to 15 reasonable changes a month — text, photos, opening hours, prices, services and business information.</p>' +
          '<button class="btn btn-primary mt-5" data-act="activate-maintenance">Activate Website Maintenance — €19.99/month</button>' +
        '</div>';
    }

    var rows = s.changeRequests.slice().reverse().map(function (r) {
      return '<tr><td class="name">' + esc(r.id) + '</td><td>' + esc(r.type) + '</td>' +
        '<td class="max-w-sm">' + esc(r.description) + '</td>' +
        '<td>' + esc(O.date(r.created)) + '</td><td>' + statusTag(r.status) + '</td></tr>';
    }).join('');

    return head('Request a Change', 'Tell us what to change.',
      'Send it here and we handle it. You will see the status move from pending to in progress to completed.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<div class="field"><label for="cr-type">Change type</label>' +
            '<select id="cr-type">' +
              ['Text', 'Photos', 'Opening hours', 'Prices', 'Services', 'Business information', 'Something else']
                .map(function (t) { return '<option>' + t + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field mt-5"><label for="cr-desc">Description</label>' +
            '<span class="hint">What should change, and what should it say instead?</span>' +
            '<textarea id="cr-desc"></textarea></div>' +
          '<div class="field mt-5"><label for="cr-text">Exact text (optional)</label>' +
            '<span class="hint">Paste the wording you want used and we will use it as written.</span>' +
            '<textarea id="cr-text"></textarea></div>' +
          '<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">' +
            '<div class="field mt-5"><label for="cr-photo">Photo upload</label><input id="cr-photo" type="file" accept="image/*" multiple></div>' +
            '<div class="field mt-5"><label for="cr-deadline">Requested deadline</label><input id="cr-deadline" type="date"></div>' +
          '</div>' +
          '<div class="field mt-5"><label for="cr-notes">Additional notes</label><textarea id="cr-notes"></textarea></div>' +
          '<button class="btn btn-primary mt-6" data-act="submit-change">Submit change request</button>' +
          '<p id="cr-done" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
        '</div>' +

        '<div class="lg:col-span-2">' +
          '<div class="card p-6"><p class="mono-label text-ink-soft">Your allowance</p>' +
            '<p class="h-section mt-2 text-2xl">' + left + ' / ' + s.maintenance.included + '</p>' +
            '<p class="mt-1 text-[0.8125rem] text-ink-soft">changes remaining this month</p>' +
            '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">Unused changes do not roll over into next month.</p>' +
          '</div>' +
          '<div class="card mt-4 p-6"><p class="mono-label text-ink-soft">Not included</p>' +
            '<ul class="mt-3 space-y-1.5 text-[0.8125rem] text-ink-mid">' +
              ['Major redesigns', 'New functionality', 'New pages beyond scope', 'Custom development']
                .map(function (i) { return '<li><span class="arrow">&rarr;</span> ' + i + '</li>'; }).join('') +
            '</ul>' +
            '<p class="mt-3 text-[0.8125rem] text-ink-soft">These are quoted separately.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Your requests</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
          '<thead><tr><th>Ref</th><th>Type</th><th>Description</th><th>Sent</th><th>Status</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
      '</div>';
  };

  routes['/maintenance'] = function () {
    var s = O.load();
    var active = O.maintenanceActive();
    var left = O.changesLeft();

    var history = s.changeRequests.slice().reverse().map(function (r) {
      return '<tr><td class="name">' + esc(r.id) + '</td><td>' + esc(r.type) + '</td>' +
        '<td>' + esc(O.date(r.created)) + '</td><td>' + statusTag(r.status) + '</td></tr>';
    }).join('');

    return head('Website Maintenance', 'Changes, handled.',
      'Send us what needs updating and we do it — no editor to learn, no plugin to update.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<div class="flex flex-wrap items-baseline justify-between gap-3">' +
            '<p class="h-section text-2xl">€19.99 <span class="text-base text-ink-soft">/ month</span></p>' +
            statusTag(active ? 'active' : 'inactive') +
          '</div>' +
          '<p class="mono-label mt-6 text-ink-soft">Included every month</p>' +
          '<ul class="mt-3 grid grid-cols-1 gap-1.5 text-[0.8125rem] text-ink-mid sm:grid-cols-2">' +
            ['Up to 15 website changes', 'Text updates', 'Photo updates', 'Opening hours',
             'Prices', 'Services', 'Business information']
              .map(function (i) { return '<li><span class="arrow">&rarr;</span> ' + i + '</li>'; }).join('') +
          '</ul>' +
          (active
            ? '<button class="btn btn-ghost mt-6" data-act="cancel-maintenance">Cancel maintenance</button>'
            : '<button class="btn btn-primary mt-6" data-act="activate-maintenance">Activate — €19.99/month</button>') +
        '</div>' +

        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">This month</p>' +
          /* No allowance until the service is on. Dividing by it gave
             a bar of NaN% and a headline of 0 / 0. */
          (s.maintenance.included
            ? '<p class="h-section mt-2 text-3xl">' + left + ' / ' + s.maintenance.included + '</p>' +
              '<p class="mt-1 text-[0.8125rem] text-ink-soft">changes remaining</p>' +
              '<div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">' +
                '<div class="h-full bg-accent" style="width:' +
                  Math.round((s.maintenance.used / s.maintenance.included) * 100) + '%"></div>' +
              '</div>' +
              '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">' + s.maintenance.used +
                ' used. Unused changes do not roll over — the allowance resets on the 1st.</p>'
            : '<p class="h-section mt-2 text-3xl">15</p>' +
              '<p class="mt-1 text-[0.8125rem] text-ink-soft">changes a month, once this is switched on</p>' +
              '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">Nothing is counting yet. The allowance starts the month you activate.</p>') +
          '<a href="#/request" class="btn btn-primary btn-block mt-5">Request a change</a>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Recent requests</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
          '<thead><tr><th>Ref</th><th>Type</th><th>Sent</th><th>Status</th></tr></thead>' +
          '<tbody>' + history + '</tbody></table></div>' +
      '</div>';
  };

  routes['/services'] = function () {
    var s = O.load(), C = O.CATALOG;
    var live = s.project.stage === 'live';
    var order = s.order || {};
    var haveOnce = (order.oneTimeItems || []).map(function (i) { return i.name; });
    var haveMonth = (order.monthlyItems || []).map(function (m) { return m.name; });
    var t = tier();
    var coveredOne = (C.included || {})[t] || [];
    var coveredMon = (C.includedMonthly || {})[t] || [];

    function row(name, priceHtml, state, note) {
      var tag = state === 'on' ? '<span class="tag tag-ok">Active</span>'
              : state === 'inc' ? '<span class="tag tag-wait">In your pack</span>'
              : '<span class="tag tag-off">Not added</span>';
      return '<div class="ord-line">' +
        '<span>' + esc(name) + (note ? ' <span class="text-ink-soft">' + note + '</span>' : '') + '</span>' +
        '<b>' + priceHtml + ' ' + tag + '</b></div>';
    }

    function group(title, items, kind) {
      if (!items.length) return '';
      return '<div class="panel mt-5">' +
        '<div class="panel-head"><h2>' + esc(title) + '</h2>' +
          '<span class="mono-label text-ink-soft">' + items.length + '</span></div>' +
        '<div class="panel-body">' + items.map(function (i) {
          var inc = (kind === 'month' ? coveredMon : coveredOne).indexOf(i.name) > -1;
          var on = kind === 'month' ? haveMonth.indexOf(i.name) > -1 : haveOnce.indexOf(i.name) > -1;
          return row(i.name,
            inc ? '&mdash;' : (i.from ? 'from ' : '') + money(i.cents) + (kind === 'month' ? '/mo' : ''),
            inc ? 'inc' : (on ? 'on' : 'off'));
        }).join('') + '</div></div>';
    }

    var groups = {};
    C.oneTime.forEach(function (x) { (groups[x.group] = groups[x.group] || []).push(x); });

    var mine = (s.project && s.project.features) || [];
    var cap = t === 'custom' ? 20 : (t === 'free' ? 0 : 34);

    function featuresPanel() {
      if (t === 'none') return '';
      var on = C.features.filter(function (f) { return mine.indexOf(f) > -1; });
      var off = C.features.filter(function (f) { return mine.indexOf(f) < 0; });

      return '<div class="panel mt-5">' +
        '<div class="panel-head"><h2>In your website</h2>' +
          '<span class="mono-label text-ink-soft">' + on.length +
          (cap ? ' of ' + cap : '') + '</span></div>' +
        '<div class="panel-body">' +
          (on.length
            ? on.map(function (f) { return row(f, '&mdash;', 'inc'); }).join('')
            : '<div class="ord-line"><span>Nothing chosen yet</span><b>&mdash;</b></div>') +
          (off.length
            ? '<details class="mt-3"><summary class="mono-label text-ink-soft" style="cursor:pointer">' +
              'Show the ' + off.length + ' you did not take</summary><div class="mt-2">' +
              off.map(function (f) { return row(f, '&mdash;', 'off'); }).join('') +
              '</div></details>'
            : '') +
        '</div></div>';
    }

    var activeCount = haveOnce.length + haveMonth.length + mine.length;

    return head('My services', 'Everything you have, and everything you could add.',
      'Anything marked "In your pack" is already covered and is never charged again.') +

      '<div class="stats mt-7">' +
        '<div class="stat"><p class="stat-l">Your pack</p><p class="stat-v">' +
          esc(window.SitehouseApp ? window.SitehouseApp.tierName(tier()) : '—') + '</p></div>' +
        '<div class="stat"><p class="stat-l">Active</p><p class="stat-v">' + activeCount + '</p>' +
          '<p class="stat-s">services and add-ons</p></div>' +
        '<div class="stat"><p class="stat-l">Monthly</p><p class="stat-v">' + money(order.monthlyCents || 0) + '</p>' +
          '<p class="stat-s">' + (live ? 'billing now' : 'starts at launch') + '</p></div>' +
        '<div class="stat"><p class="stat-l">Available</p><p class="stat-v">' +
          (C.oneTime.length + C.monthly.length) + '</p><p class="stat-s">in the catalogue</p></div>' +
      '</div>' +

      featuresPanel() +
      group('Monthly services', C.monthly, 'month') +
      Object.keys(groups).map(function (g) {
        return group((C.groups || {})[g] || g, groups[g], 'once');
      }).join('') +

      '<div class="mt-6"><a class="btn btn-primary" href="#/build">Add something</a>' +
        ' <a class="btn btn-ghost" href="extras.html">See what each one does</a></div>';
  };

  // ── Build your package ───────────────────────────────────
  function draft() {
    var s = O.load();
    if (!s.draft) { s.draft = O.emptyDraft(); O.save(); }
    return s.draft;
  }

  // Which tier this account is on. An account with an order but no
  // explicit tier bought a Custom Website.
  function tier() {
    var s = O.load();
    if (s.tier) return s.tier;
    return (s.order && s.order.oneTimeCents > 0) ? 'custom' : 'none';
  }
  function paid() { var t = tier(); return t !== 'none' && t !== 'free'; }

  // Add-ons a tier already covers cost nothing and cannot be unpicked.
  function coveredOnce(key) { return (O.CATALOG.included || {})[key] || []; }
  function coveredMonth(key) { return (O.CATALOG.includedMonthly || {})[key] || []; }

  // One-time and monthly totals for whatever is currently selected.
  function draftTotals() {
    var d = draft(), C = O.CATALOG;
    var once = 0, month = 0;

    var base = C.websites.filter(function (w) { return w.key === d.base; })[0];
    if (base) once += base.cents;

    var inOnce = base ? coveredOnce(base.key) : [];
    var inMonth = base ? coveredMonth(base.key) : [];

    C.oneTime.forEach(function (i) {
      if (d.oneTime.indexOf(i.name) < 0) return;
      if (inOnce.indexOf(i.name) > -1) return;      // already in the tier
      once += i.cents;
    });
    C.monthly.forEach(function (m) {
      if (d.monthly.indexOf(m.name) < 0) return;
      if (inMonth.indexOf(m.name) > -1) return;
      month += m.cents;
    });

    return { once: once, month: month, deposit: O.deposit(once),
             balance: O.balance(once), base: base, inOnce: inOnce, inMonth: inMonth };
  }

  function draftReady() {
    var d = draft(), t = draftTotals();
    if (!t.base) return false;
    if (t.base.key === 'custom' && d.features.length < 3) return false;
    return d.agreed;
  }

  /* The order rail lives in app.js, outside this file, because it has
     to stay on screen while the page under it scrolls. It needs the
     draft to show what is being chosen, so the draft is published
     here rather than duplicated there — one source, one set of
     numbers, no chance of the two panels disagreeing. */
  window.SitehouseDraft = {
    blocked: function () {
      var d = draft(), t = draftTotals();
      if (!t.base) return 'Choose a website to continue.';
      if (t.base.key === 'custom' && d.features.length < 3) return 'Pick at least three features.';
      if (!d.agreed) return null;                 // the tick box says it itself
      return t.deposit > 0
        ? 'Only the 25% deposit is charged today.'
        : 'Nothing is charged for the free page.';
    },
    agreed: function () { return draft().agreed; },
    totals: function () {
      var t = draftTotals();
      t.ready = draftReady();
      return t;
    },
    lines: function () {
      var d = draft(), C = O.CATALOG, t = draftTotals();
      var once = [];
      if (t.base) once.push([t.base.name, O.euro(t.base.cents)]);
      C.oneTime.forEach(function (i) {
        if (d.oneTime.indexOf(i.name) < 0) return;
        once.push([i.name, t.inOnce.indexOf(i.name) > -1 ? 'Included' : O.euro(i.cents)]);
      });
      var month = [];
      C.monthly.forEach(function (m) {
        if (d.monthly.indexOf(m.name) < 0) return;
        month.push([m.name, t.inMonth.indexOf(m.name) > -1 ? 'Included' : O.euro(m.cents) + '/mo']);
      });
      return { once: once, month: month };
    }
  };

  routes['/build'] = function () {
    var C = O.CATALOG, d = draft(), t = draftTotals();
    var base = t.base;
    var key = base ? base.key : null;
    var isFree = key === 'free';
    var isCustom = key === 'custom';
    var capped = base && base.cap > 0 && base.cap < C.features.length;   // Custom only
    var featuresOn = (key === 'full' || key === 'complete') ? C.features.slice() : d.features;
    var atCap = capped && d.features.length >= base.cap;

    function tile(o) {
      var state = o.included ? 'Included' : (o.on ? 'Added' : 'Add');
      return '<button type="button" class="build-card' +
          (o.on || o.included ? ' is-on' : '') + (o.included ? ' is-locked' : '') + '"' +
          (o.off || o.included ? ' disabled' : '') +
          ' data-act="' + o.act + '" data-key="' + esc(o.key) + '">' +
        '<span class="build-top">' +
          '<span class="build-name">' + esc(o.name) + '</span>' +
          (o.price ? '<span class="build-price">' + o.price + '</span>' : '') +
        '</span>' +
        (o.tag ? '<span class="build-tags">' + o.tag + '</span>' : '') +
        (o.blurb ? '<span class="build-blurb">' + esc(o.blurb) + '</span>' : '') +
        '<span class="build-state">' + state + '</span>' +
      '</button>';
    }

    /* Step 01 — the tier */
    var websites = C.websites.map(function (w) {
      return tile({
        on: d.base === w.key, name: w.name,
        price: w.cents === 0 ? 'Free' : money(w.cents),
        tag: w.cents === 0
          ? '<span class="tag tag-ok">No card needed</span>'
          : '<span class="tag tag-once">One-time</span>' +
            (w.years ? ' <span class="tag tag-wait">' + w.years + (w.years > 1 ? ' years' : ' year') + ' hosting</span>' : ''),
        blurb: w.blurb + ' ' + w.note, act: 'pick-base', key: w.key
      });
    }).join('');

    /* Step 02 — features */
    var featureNote =
      !base ? 'Choose a website first.' :
      isFree ? 'The free page is a fixed layout — name, map, hours, photos and your buttons. Nothing to pick.' :
      capped ? ('Pick between three and ' + base.cap + '. ' + d.features.length + ' of ' + base.cap +
                ' chosen — anything in that range costs the same.') :
      'All 34 are built in at this tier. Nothing to choose and nothing to add later.';

    var features = C.features.map(function (f) {
      var on = featuresOn.indexOf(f) > -1;
      // At the cap, the ones already chosen stay clickable so you can
      // swap; the rest go quiet rather than silently doing nothing.
      var off = !isCustom || (atCap && !on);
      return tile({ on: on, name: f, act: 'toggle-feature', key: f, off: off });
    }).join('');

    /* Step 03 — the add-ons, by group */
    var groups = {};
    C.oneTime.forEach(function (x) { (groups[x.group] = groups[x.group] || []).push(x); });
    var addons = Object.keys(groups).map(function (g) {
      return '<p class="mono-label mt-7 text-ink-soft">' + esc((C.groups || {})[g] || g) + '</p>' +
        '<div class="build-grid mt-3">' +
        groups[g].map(function (x) {
          var inc = t.inOnce.indexOf(x.name) > -1;
          return tile({
            on: d.oneTime.indexOf(x.name) > -1, included: inc, name: x.name,
            price: inc ? 'In your pack' : (x.from ? 'From ' : '') + money(x.cents),
            tag: inc ? '' : '<span class="tag tag-once">One-time</span>',
            act: 'toggle-onetime', key: x.name, off: !base || isFree
          });
        }).join('') + '</div>';
    }).join('');

    /* Step 04 — monthly */
    var monthly = C.monthly.map(function (m) {
      var inc = t.inMonth.indexOf(m.name) > -1;
      return tile({
        on: d.monthly.indexOf(m.name) > -1, included: inc, name: m.name,
        price: inc ? 'In your pack' : money(m.cents),
        tag: inc ? '' : '<span class="tag tag-month">Per month</span>',
        act: 'toggle-monthly', key: m.name, off: !base || isFree
      });
    }).join('');

    function step(n, title, aside, body) {
      return '<section class="build-step">' +
        '<div class="build-step-head">' +
          '<span class="mono-label text-ink-soft">Step ' + n + '</span>' +
          '<h2 class="h-section text-xl">' + title + '</h2>' +
          (aside ? '<span class="build-step-aside mono-label text-ink-soft">' + aside + '</span>' : '') +
        '</div>' + body + '</section>';
    }

    return head('Build your package', 'Choose what you need.',
      'Pick a website, what goes in it, and anything around it. You pay 25% today and the rest once you have seen the finished site.') +

      '<div class="build-wrap build-wrap--solo">' +
        '<div class="build-main">' +

          step('01', 'Your website', base ? esc(base.name) + ' selected' : 'Nothing chosen yet',
            '<div class="build-grid mt-4">' + websites + '</div>') +

          step('02', 'What goes in it',
            base ? (isFree ? 'Fixed layout' : (capped ? d.features.length + ' of ' + base.cap : 'All 34')) : '',
            '<p class="build-note">' + esc(featureNote) + '</p>' +
            '<div class="build-grid mt-4">' + features + '</div>') +

          step('03', 'Add-ons', 'Optional · paid once', addons) +

          step('04', 'Monthly services', 'Starts the day you go live',
            '<div class="build-grid mt-4">' + monthly + '</div>') +

        '</div>' +

      '</div>';
  };

  /* ── Our work ────────────────────────────────────────────────
     The place is built; the entries come from the staff dashboard
     once that exists. An empty state that says so beats a section
     that quietly is not there. */
  routes['/work'] = function () {
    return head('Our work', 'Websites we have built.',
      'Every site here was built by us for a real business. Yours can be in it too — say the word when it goes live.') +
      '<div class="work-empty">' +
        '<div class="work-empty-mark" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="2.5" y="4" width="19" height="15" rx="2"/><path d="M2.5 8h19M6 6h.01M8.5 6h.01M11 6h.01"/></svg>' +
        '</div>' +
        '<p class="work-empty-h">Nothing here yet.</p>' +
        '<p class="work-empty-p">The finished sites will be listed here as they go live — screenshot, ' +
          'business, and a link you can open. We are wiring this up to the staff dashboard next.</p>' +
      '</div>';
  };

  routes['/subscriptions'] = function () {
    var s = O.load(), o = s.order;
    var live = s.project.stage === 'live';
    var nextBilling = live ? O.date('2026-09-18') : 'When your website goes live';

    var rows = o.monthlyItems.map(function (m) {
      return '<tr><td class="name">' + esc(m.name) + '</td>' +
        '<td class="font-mono">' + money(m.cents) + ' / month</td>' +
        '<td>Monthly</td>' +
        '<td>' + esc(nextBilling) + '</td>' +
        '<td>' + statusTag(live ? 'active' : 'pending') + '</td>' +
        '<td><button class="btn btn-ghost px-3 py-1 text-[0.75rem]" data-act="cancel-service" data-name="' + esc(m.name) + '">Cancel</button></td></tr>';
    }).join('');

    return head('Subscriptions', 'What recurs, and when.',
      'Monthly services are separate from your one-time website cost. They start at launch and can be stopped at any time.') +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Monthly total</p><p class="h-section mt-2 text-xl">' + money(o.monthlyCents) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Billing frequency</p><p class="h-section mt-2 text-xl">Monthly</p><p class="mt-1 text-[0.8125rem] text-ink-soft">No minimum term</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Next billing date</p><p class="h-section mt-2 text-base">' + esc(nextBilling) + '</p></div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Active subscriptions</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
          '<thead><tr><th>Service</th><th>Price</th><th>Billing</th><th>Next payment</th><th>Status</th><th></th></tr></thead>' +
          '<tbody>' + (rows || '<tr><td colspan="6" class="text-ink-soft">No monthly services selected.</td></tr>') + '</tbody>' +
        '</table></div>' +
        '<p id="sub-note" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Cancelling</p>' +
        '<ul class="mt-3 space-y-2 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          '<li><span class="arrow">&rarr;</span> Cancel here or by email — no minimum term, no reason required.</li>' +
          '<li><span class="arrow">&rarr;</span> Cancellation takes effect at the end of the period you have already paid for.</li>' +
          '<li><span class="arrow">&rarr;</span> Cancelling a service does not take your website offline.</li>' +
          '<li><span class="arrow">&rarr;</span> Full detail in the <a href="refunds.html" class="font-semibold text-accent underline underline-offset-2">Cancellation &amp; Refund Policy</a>.</li>' +
        '</ul>' +
        '<a href="#/services" class="btn btn-ghost mt-5">Add a service</a>' +
      '</div>';
  };

  routes['/account'] = function () {
    var s = O.load(), c = s.customer;
    function f(id, label, val, type) {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '"></div>';
    }
    function toggle(id, label, hint, on) {
      return '<label class="flex cursor-pointer items-start gap-3 border-b border-line py-3">' +
        '<input id="' + id + '" type="checkbox" class="mt-1 h-4 w-4 flex-none accent-accent"' + (on ? ' checked' : '') + '>' +
        '<span><span class="block text-sm font-semibold">' + esc(label) + '</span>' +
        '<span class="block text-[0.8125rem] text-ink-soft">' + esc(hint) + '</span></span></label>';
    }

    return head('Account Settings', 'Your details and preferences.', null) +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Personal information</p>' +
          '<div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">' +
            f('ac-first', 'First name', c.firstName) + f('ac-last', 'Last name', c.lastName) +
          '</div>' +
          '<div class="mt-5 grid grid-cols-1 gap-5">' +
            f('ac-email', 'Email', c.email, 'email') + f('ac-phone', 'Phone', c.phone, 'tel') +
          '</div>' +
          '<button class="btn btn-primary mt-6" data-act="save-account">Save changes</button>' +
          '<p id="account-done" class="mt-3 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
        '</div>' +

        '<div>' +
          '<div class="card p-6"><p class="mono-label text-ink-soft">Business information</p>' +
            '<div class="mt-5 grid grid-cols-1 gap-5">' +
              f('ac-business', 'Business name', c.business) + f('ac-address', 'Address', c.address) +
            '</div>' +
            '<p class="mt-4 text-[0.8125rem] text-ink-soft">Changing what appears on your website? Use <a href="#/business" class="font-semibold text-accent underline underline-offset-2">Business Information</a> instead.</p>' +
          '</div>' +

          '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Password</p>' +
            '<div class="mt-5 grid grid-cols-1 gap-5">' +
              '<div class="field"><label for="ac-pw">New password</label><input id="ac-pw" type="password"></div>' +
              '<div class="field"><label for="ac-pw2">Confirm password</label><input id="ac-pw2" type="password"></div>' +
            '</div>' +
            '<button class="btn btn-ghost mt-5" data-act="save-password">Update password</button>' +
            '<p id="pw-done" class="mt-3 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Notification preferences</p>' +
        '<div class="mt-4">' +
          toggle('nt-project', 'Project updates', 'Build progress, review ready, going live.', true) +
          toggle('nt-payment', 'Payment reminders', 'When the remaining 75% or a monthly payment is due.', true) +
          toggle('nt-changes', 'Change requests', 'When a request moves to in progress or completed.', true) +
          toggle('nt-news', 'Product news', 'New services such as AI Receptionist when they open.', false) +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Language and currency</p>' +
        '<p class="mt-3 text-[0.8125rem] text-ink-mid">How the dashboard reads, and the currency your totals are shown in.</p>' +
        '<div class="mt-5" data-i18n-slot></div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Session</p>' +
        '<p class="mt-3 text-[0.8125rem] text-ink-mid">Signed in as ' + esc(s.session ? s.session.email : c.email) + '.</p>' +
        '<button class="btn btn-ghost mt-4" data-act="logout">Log out</button>' +
      '</div>';
  };

  routes['/support'] = function () {
    var s = O.load();
    var threads = s.support.slice().reverse().map(function (t) {
      return '<div class="card p-5">' +
        '<div class="flex flex-wrap items-start justify-between gap-3">' +
          '<p class="h-section text-base">' + esc(t.subject) + '</p>' + statusTag(t.status) +
        '</div>' +
        '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + esc(t.id) + ' · ' + esc(O.date(t.created)) + '</p>' +
        '<ul class="timeline mt-4 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          t.messages.map(function (m) {
            return '<li><span class="font-semibold text-ink">' + esc(m.from === 'you' ? 'You' : m.from) + '</span> · ' +
              esc(O.date(m.at)) + '<br>' + esc(m.body) + '</li>';
          }).join('') +
        '</ul></div>';
    }).join('');

    return head('Support', 'Need help?',
      'Ask about your website, your payments, or anything else. We answer here.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<div class="field"><label for="sup-topic">What is it about?</label>' +
            '<select id="sup-topic">' +
              ['My website', 'Payments', 'A change request', 'My account', 'Something else']
                .map(function (t) { return '<option>' + t + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field mt-5"><label for="sup-subject">Subject</label><input id="sup-subject" type="text"></div>' +
          '<div class="field mt-5"><label for="sup-body">Message</label><textarea id="sup-body"></textarea></div>' +
          '<button class="btn btn-primary mt-6" data-act="send-support">Send message</button>' +
          '<p id="sup-done" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
        '</div>' +
        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">Faster answers</p>' +
          '<ul class="mt-3 space-y-2 text-[0.8125rem] text-ink-mid">' +
            '<li><span class="arrow">&rarr;</span> Website changes go through <a href="#/request" class="font-semibold text-accent underline underline-offset-2">Request a Change</a>, not support.</li>' +
            '<li><span class="arrow">&rarr;</span> Payment questions are usually answered on <a href="#/payments" class="font-semibold text-accent underline underline-offset-2">Payments</a>.</li>' +
            '<li><span class="arrow">&rarr;</span> Terms, cancellation and ownership are in the <a href="terms.html" class="font-semibold text-accent underline underline-offset-2">Terms of Service</a>.</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +

      '<p class="mono-label mt-8 text-ink-soft">Previous messages</p>' +
      '<div class="mt-3 grid grid-cols-1 gap-3">' + (threads || '<p class="text-[0.8125rem] text-ink-soft">No messages yet.</p>') + '</div>';
  };

  // ── Actions ──────────────────────────────────────────────────
  function toggleIn(list, value) {
    var i = list.indexOf(value);
    if (i > -1) { list.splice(i, 1); } else { list.push(value); }
  }

  var actions = {
    'pick-base': function (el) {
      var d = draft();
      var key = el.getAttribute('data-key');
      // Switching website starts the feature choice again — the professional
      // build ticks everything, so its picks must not carry into a custom one.
      if (d.base !== key) { d.features = []; }
      d.base = key;
      O.save();
      render(true);
    },
    'toggle-feature': function (el) { toggleIn(draft().features, el.getAttribute('data-key')); O.save(); render(true); },
    'toggle-onetime': function (el) { toggleIn(draft().oneTime, el.getAttribute('data-key')); O.save(); render(true); },
    'toggle-monthly': function (el) { toggleIn(draft().monthly, el.getAttribute('data-key')); O.save(); render(true); },

    'toggle-agree':   function () { var d = draft(); d.agreed = !d.agreed; O.save(); render(true); },
    'approve-site': function () {
      var s = O.load();
      if (s.project.stage !== 'review') return;
      s.project.stage = 'live';
      s.project.lastUpdate = new Date().toISOString().slice(0, 10);
      (s.payments || []).forEach(function (p) {
        if (p.status === 'due-after-approval') { p.status = 'due'; p.date = s.project.lastUpdate; }
      });
      O.notify('You approved your website. The remaining balance is now due.');
      O.save();
      render(true);
    },
    'go-build':   function () { location.hash = '#/build'; },
    'go-website': function () { location.hash = '#/website'; },

    'clear-draft':    function () { var s = O.load(); s.draft = O.emptyDraft(); O.save(); render(true); },

    'pay-deposit': function () {
      if (!draftReady()) return;
      var s = O.load(), d = draft(), t = draftTotals(), C = O.CATALOG;

      var onceItems = [{ name: t.base.name, cents: t.base.cents }];
      C.oneTime.forEach(function (i) {
        if (d.oneTime.indexOf(i.name) < 0) return;
        // Anything the tier already covers goes on the order at zero
        // rather than being left off it — they should see they got it.
        onceItems.push({ name: i.name, cents: t.inOnce.indexOf(i.name) > -1 ? 0 : i.cents });
      });

      s.order = {
        oneTimeCents: t.once,
        monthlyCents: t.month,
        oneTimeItems: onceItems,
        monthlyItems: C.monthly.filter(function (m) { return d.monthly.indexOf(m.name) > -1; })
                               .map(function (m) { return { name: m.name, cents: m.cents }; })
      };

      s.project.features = (d.base === 'full' || d.base === 'complete') ? C.features.slice() : d.features.slice();
      s.tier = d.base;
      s.project.stage = 'content';

      var today = new Date().toISOString().slice(0, 10);
      s.payments = [
        { id: 'INV-' + (1050 + Math.floor(Math.random() * 40)), date: today,
          description: '25% deposit — ' + t.base.name, cents: t.deposit, kind: 'one-time', status: 'paid' },
        { id: 'INV-' + (1090 + Math.floor(Math.random() * 40)), date: null,
          description: 'Remaining 75% — due after you approve the website', cents: t.balance, kind: 'one-time', status: 'due-after-approval' }
      ];

      // Services follow what was actually bought
      s.services.forEach(function (sv) {
        if (sv.cadence === 'month') { sv.state = d.monthly.indexOf(sv.name) > -1 ? 'active' : 'available'; }
        else if (sv.cadence === 'once' && sv.state !== 'soon') {
          sv.state = (sv.name === t.base.name || d.oneTime.indexOf(sv.name) > -1) ? 'active' : 'available';
        }
      });

      s.draft = O.emptyDraft();
      O.save();
      O.notify('Deposit of ' + money(t.deposit) + ' received — your project has started. Send us your content next.');
      location.hash = '#/overview';
      render();
    },

    approve: function () {
      O.advance('final');
      O.notify('Website approved — your remaining 75% payment is now due.');
      render();
    },
    changes: function () { location.hash = '#/request'; },
    'pay-final': function () {
      O.advance('live');
      var s = O.load();
      s.payments[1].status = 'paid';
      s.payments[1].date = new Date().toISOString().slice(0, 10);
      O.save();
      O.notify('Final payment received — your website is live and your monthly services have started.');
      render();
    },
    preview: function () { document.getElementById('preview-note').classList.remove('hidden'); },
    invoice: function (el) {
      var n = document.getElementById('invoice-note');
      n.textContent = 'Receipt ' + el.getAttribute('data-id') + ' would download here. Invoicing is not wired up in this demo.';
      n.classList.remove('hidden');
    },
    'submit-business': function () {
      var s = O.load();
      s.changeRequests.push({
        id: 'CR-' + (125 + s.changeRequests.length),
        type: 'Business information',
        description: 'Business information updated from the dashboard.',
        created: new Date().toISOString().slice(0, 10),
        deadline: '', status: 'pending', notes: ''
      });
      if (O.maintenanceActive()) { s.maintenance.used = Math.min(s.maintenance.included, s.maintenance.used + 1); }
      O.save();
      O.notify('Change request received — your business information is queued for review.');
      var d = document.getElementById('business-done');
      d.textContent = 'Sent to Sitehouse. Nothing has been published yet — we will action it and mark it completed.';
      d.classList.remove('hidden');
      paintBell();
    },
    'submit-change': function () {
      var desc = document.getElementById('cr-desc').value.trim();
      var done = document.getElementById('cr-done');
      if (!desc) { done.textContent = 'Add a short description so we know what to change.'; done.classList.remove('hidden'); return; }
      if (O.changesLeft() <= 0) { done.textContent = 'You have used all 15 changes this month. The allowance resets on the 1st.'; done.classList.remove('hidden'); return; }
      var s = O.load();
      s.changeRequests.push({
        id: 'CR-' + (125 + s.changeRequests.length),
        type: document.getElementById('cr-type').value,
        description: desc,
        created: new Date().toISOString().slice(0, 10),
        deadline: document.getElementById('cr-deadline').value,
        status: 'pending',
        notes: document.getElementById('cr-notes').value.trim()
      });
      s.maintenance.used = Math.min(s.maintenance.included, s.maintenance.used + 1);
      O.save();
      O.notify('Change request received. We will move it to in progress shortly.');
      render();
    },
    'activate-maintenance': function () {
      var s = O.load();
      s.services.forEach(function (x) { if (x.name === 'Website Maintenance') x.state = 'active'; });
      if (!s.order.monthlyItems.some(function (m) { return m.name === 'Website Maintenance'; })) {
        s.order.monthlyItems.push({ name: 'Website Maintenance', cents: 1999 });
        s.order.monthlyCents += 1999;
      }
      O.save();
      O.notify('Website Maintenance is active — 15 changes a month.');
      render();
    },
    'cancel-maintenance': function () {
      var s = O.load();
      s.services.forEach(function (x) { if (x.name === 'Website Maintenance') x.state = 'available'; });
      s.order.monthlyItems = s.order.monthlyItems.filter(function (m) { return m.name !== 'Website Maintenance'; });
      s.order.monthlyCents = s.order.monthlyItems.reduce(function (t, m) { return t + m.cents; }, 0);
      O.save();
      O.notify('Website Maintenance cancelled. It stays available until the end of the paid month.');
      render();
    },
    'cancel-service': function (el) {
      var name = el.getAttribute('data-name');
      var s = O.load();
      s.services.forEach(function (x) { if (x.name === name) x.state = 'available'; });
      s.order.monthlyItems = s.order.monthlyItems.filter(function (m) { return m.name !== name; });
      s.order.monthlyCents = s.order.monthlyItems.reduce(function (t, m) { return t + m.cents; }, 0);
      O.save();
      O.notify(name + ' cancelled. It stays available until the end of the period you have paid for.');
      render();
      var n = document.getElementById('sub-note');
      if (n) {
        n.textContent = name + ' cancelled. It runs until the end of the paid period, then stops.';
        n.classList.remove('hidden');
      }
    },
    'activate-service': function (el) {
      var name = el.getAttribute('data-name');
      var s = O.load();
      var sv = s.services.filter(function (x) { return x.name === name; })[0];
      if (!sv) return;
      sv.state = 'active';
      if (sv.cadence === 'month' && !s.order.monthlyItems.some(function (m) { return m.name === name; })) {
        s.order.monthlyItems.push({ name: name, cents: sv.cents });
        s.order.monthlyCents += sv.cents;
      }
      O.save();
      O.notify(name + ' is now active.');
      render();
    },
    'save-account': function () {
      var s = O.load(), c = s.customer;
      c.firstName = document.getElementById('ac-first').value.trim() || c.firstName;
      c.lastName  = document.getElementById('ac-last').value.trim()  || c.lastName;
      c.email     = document.getElementById('ac-email').value.trim() || c.email;
      c.phone     = document.getElementById('ac-phone').value.trim() || c.phone;
      c.business  = document.getElementById('ac-business').value.trim() || c.business;
      c.address   = document.getElementById('ac-address').value.trim() || c.address;
      O.save();
      var d = document.getElementById('account-done');
      d.textContent = 'Saved.';
      d.classList.remove('hidden');
      paintWho();
    },
    'save-password': function (el) {
      var a = document.getElementById('ac-pw').value, b = document.getElementById('ac-pw2').value;
      var d = document.getElementById('pw-done');
      d.classList.remove('hidden');

      if (!a) { d.textContent = 'Enter a new password.'; return; }
      if (a.length < 8) { d.textContent = 'Use at least eight characters.'; return; }
      if (a !== b) { d.textContent = 'Those passwords do not match.'; return; }
      if (!window.SitehouseAuth) { d.textContent = 'Not connected. Reload the page and try again.'; return; }

      d.textContent = 'Saving…';
      if (el) el.disabled = true;
      window.SitehouseAuth.setPassword(a).then(function () {
        d.textContent = 'Password changed.';
        document.getElementById('ac-pw').value = '';
        document.getElementById('ac-pw2').value = '';
      })['catch'](function (err) {
        d.textContent = window.SitehouseAuth.message(err);
      }).then(function () { if (el) el.disabled = false; });
    },
    'send-support': function () {
      var subject = document.getElementById('sup-subject').value.trim();
      var body = document.getElementById('sup-body').value.trim();
      var done = document.getElementById('sup-done');
      if (!body) { done.textContent = 'Write a message first.'; done.classList.remove('hidden'); return; }
      var s = O.load();
      s.support.push({
        id: 'SUP-' + (32 + s.support.length),
        subject: subject || document.getElementById('sup-topic').value,
        status: 'open',
        created: new Date().toISOString().slice(0, 10),
        messages: [{ from: 'you', at: new Date().toISOString().slice(0, 10), body: body }]
      });
      O.save();
      O.notify('Message sent to Sitehouse. We usually reply the same working day.');
      render();
    },
    logout: function () {
      O.signOut();
      if (window.SitehouseAuth) window.SitehouseAuth.signOut();
      location.href = 'login.html';
    }
  };

  // ── Chrome ───────────────────────────────────────────────────
  function paintWho() {
    var s = O.load();
    document.getElementById('who').textContent = s.customer.business;
  }

  function paintBell() {
    var s = O.load();
    var n = O.unreadCount();
    var badge = document.getElementById('bell-count');
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
    document.getElementById('bell-list').innerHTML = s.notifications.map(function (x) {
      return '<li class="border-b border-line px-4 py-3 last:border-b-0">' +
        '<p class="text-[0.8125rem] leading-snug ' + (x.read ? 'text-ink-soft' : 'font-semibold text-ink') + '">' + esc(x.text) + '</p>' +
        '<p class="mt-1 text-[0.75rem] text-ink-soft">' + esc(O.date(x.at)) + '</p></li>';
    }).join('');
  }

  function paintNav(route) {
    [].forEach.call(document.querySelectorAll('.app-nav a'), function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + route);
    });
  }

  // Bottom tabs mirror the sidebar on phones; Requests maps to the
  // change-request route, which is where people actually go.
  function paintTabs(route) {
    [].forEach.call(document.querySelectorAll('.m-tab'), function (t) {
      t.classList.toggle('is-on', t.getAttribute('data-tab') === route);
    });
  }

  // A compact always-visible total while building a package on a phone.
  function paintStickyBar(route) {
    var bar = document.getElementById('m-build-bar');
    if (!bar) return;
    var on = route === '/build';
    document.body.classList.toggle('has-sticky-bar', on);
    if (!on) { bar.classList.remove('is-up'); return; }

    var t = draftTotals();
    bar.querySelector('[data-bar-figure]').textContent =
      money(t.once) + ' one-time' + (t.month ? ' + ' + money(t.month) + '/mo' : '');
    bar.querySelector('[data-bar-sub]').textContent =
      t.once ? 'Pay today ' + money(t.deposit) + ' — 25% deposit' : 'Choose a website to begin';
    var btn = bar.querySelector('[data-bar-cta]');
    btn.disabled = !draftReady();
    btn.textContent = draftReady() ? 'Pay ' + money(t.deposit) + ' & start' : 'Continue';
    bar.classList.add('is-up');
  }

  /* render(true) keeps you where you were.
     Ticking a feature rebuilds the view — that is how this screen has
     always worked — but it also used to throw the page back to the top
     and drop focus, so choosing three things in a row meant scrolling
     back down three times. Arriving at a new route should start at the
     top; changing something on the route you are already on should not
     move you at all. */
  // Nav items a free or brand-new account has no use for yet. They are
  // removed rather than shown disabled: a sidebar of dead links is a
  // worse first impression than a short one.
  var PAID_ONLY = ['/website', '/payments', '/request', '/maintenance', '/subscriptions'];

  // The bottom bar holds five at most before it stops being tappable, so
  // the two halves of the audience get different fives: a paying customer
  // needs their project, a free one needs the way up.
  var FREE_ONLY = ['/build', '/work'];

  // Five is the ceiling for a bottom bar. Requests lives in the sidebar
  // and in the overview, so it is the one that gives up its slot.
  var TAB_NEVER = ['/request'];

  function gateNav() {
    var open = paid();
    [].forEach.call(document.querySelectorAll('.app-nav a, .m-tab'), function (a) {
      var route = (a.getAttribute('href') || '').replace('#', '');
      var isTab = a.classList.contains('m-tab');

      // The bottom bar is capped first: whatever else is true about a
      // route, it cannot claim a sixth slot down there.
      if (isTab && TAB_NEVER.indexOf(route) > -1) { a.hidden = true; return; }
      if (isTab && FREE_ONLY.indexOf(route) > -1) { a.hidden = open; return; }
      if (PAID_ONLY.indexOf(route) > -1) { a.hidden = !open; return; }
      a.hidden = false;
    });
    [].forEach.call(document.querySelectorAll('.nav-group'), function (p) {
      // Hide a group heading whose whole group just disappeared.
      var any = false, n = p.nextElementSibling;
      while (n && n.tagName === 'A') { if (!n.hidden) any = true; n = n.nextElementSibling; }
      p.hidden = !any;
    });
  }

  function render(keepPlace) {
    var y = keepPlace ? (window.scrollY || window.pageYOffset) : 0;
    var refocus = null;

    if (keepPlace && document.activeElement && document.activeElement.closest) {
      var was = document.activeElement.closest('[data-act]');
      if (was) {
        refocus = '[data-act="' + was.getAttribute('data-act') + '"]' +
                  (was.getAttribute('data-key')
                    ? '[data-key="' + was.getAttribute('data-key').replace(/"/g, '\\"') + '"]'
                    : '');
      }
    }

    var route = (location.hash || '#/overview').replace('#', '');
    if (!routes[route]) route = '/overview';
    document.body.setAttribute('data-route', route.replace('/', ''));
    view.innerHTML = routes[route]();
    paintNav(route);
    paintTabs(route);
    paintBell();
    paintWho();
    paintStickyBar(route);
    if (window.SitehouseMobile) { window.SitehouseMobile.labelTables(view); }
    gateNav();
    if (window.SitehouseApp) { window.SitehouseApp.paintRail(); window.SitehouseApp.bindPreviews(); }
    if (window.SitehouseSheet) window.SitehouseSheet.close();
    if (window.SitehouseI18n) { window.SitehouseI18n.mount(); }

    window.scrollTo(0, y);
    if (refocus) {
      var again = view.querySelector(refocus);
      if (again) again.focus({ preventScroll: true });
    }
  }

  // Delegated so re-rendered markup keeps working.
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el); }
  });

  document.getElementById('bell').addEventListener('click', function () {
    document.getElementById('bell-panel').classList.toggle('hidden');
  });
  document.getElementById('mark-read').addEventListener('click', function () {
    O.markAllRead();
    paintBell();
  });
  document.getElementById('logout').addEventListener('click', actions.logout);
  document.getElementById('nav-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('hidden');
  });
  document.addEventListener('click', function (e) {
    var panel = document.getElementById('bell-panel');
    if (!panel.classList.contains('hidden') &&
        !e.target.closest('#bell-panel') && !e.target.closest('#bell')) {
      panel.classList.add('hidden');
    }
  });

  window.addEventListener('hashchange', function () { render(false); });

  // Every figure on this screen is formatted at render time by O.euro(),
  // so a currency change means re-rendering — in place, without moving you.
  document.addEventListener('sitehouse:i18n', function () { render(true); });

  // Nothing renders until there is a real session behind it.
  O.requireAuth().then(function () { render(false); });

  // app.js posts ratings and needs the view redrawn afterwards.
  window.SitehouseDash = { render: render };

  // No bare render() here on purpose: it would paint the whole
  // dashboard for a signed-out visitor in the moment before
  // requireAuth() resolves and redirects them.
})();
